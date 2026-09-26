"""
Kizuna AI Agent Backend - Python/FastAPI
Enhanced Pet Profiles & AI Service
"""

import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
if not os.path.exists(ENV_PATH):
    print(f"CRITICAL WARNING: .env file NOT FOUND at {ENV_PATH}")
else:
    print(f"Found .env at {ENV_PATH}")
load_dotenv(ENV_PATH, override=True)
load_dotenv(os.path.join(BASE_DIR, ".env.local"), override=True)

from services.supabase_db import (
    init_db,
    list_pets as db_list_pets,
    create_pet as db_create_pet,
    bulk_insert_pets,
    delete_pet as db_delete_pet,
    list_campaigns as db_list_campaigns,
    create_campaign as db_create_campaign,
    list_target_pets,
    create_draft as db_create_draft,
    list_pending_drafts as db_list_pending_drafts,
    get_draft_with_owner_phone,
    update_draft_status,
    list_settings as db_list_settings,
    upsert_settings as db_upsert_settings,
    list_whatsapp_conversations,
    list_recent_conversation_messages,
    list_care_cases,
    update_care_case,
    upsert_care_case,
    bootstrap_user_clinic,
    get_whatsapp_account,
    pet_belongs_to_clinic,
)
from services.auth import (
    AuthenticatedUser,
    TenantContext,
    get_authenticated_user,
    get_tenant_context,
    require_roles,
)
from services.gemini import generate_reminder, get_analytics_summary
from services.kapso import (
    KapsoAPIError,
    KapsoConfigurationError,
    process_kapso_webhook,
    send_whatsapp_interactive,
    send_whatsapp_reminder,
    send_whatsapp_text,
    send_whatsapp_template,
    verify_kapso_signature,
)
from services.telegram_bot import start_telegram_bot
from services.scribe import generate_clinical_note
from services.care_assistant import assess_owner_message
from services.transcription import (
    TranscriptionConfigurationError,
    TranscriptionError,
    transcribe_wav,
)

import pandas as pd
from fastapi import UploadFile, File
import io

# --- Models ---
class PetRequest(BaseModel):
    name: str
    ownerName: str
    ownerPhone: str
    species: str
    breed: Optional[str] = "Unknown"
    sex: Optional[str] = "Unknown"
    color: Optional[str] = "Unknown"
    age: Optional[str] = "Unknown"
    weight: Optional[str] = "Unknown"
    status: Optional[str] = "Healthy"
    birthday: Optional[str] = None
    lastVaccinationDate: Optional[str] = None
    nextVaccinationDate: Optional[str] = None
    lastDewormingDate: Optional[str] = None
    lastCheckupDate: Optional[str] = None

class DraftAction(BaseModel):
    draftId: str
    approved: bool
    message: Optional[str] = None

class InsightsRequest(BaseModel):
    stats: dict

class ReminderGenerateRequest(BaseModel):
    petName: str
    ownerName: str
    clinicName: str
    type: str 
    bookingUrl: str
    tone: Optional[str] = "friendly"

class ReminderSendRequest(BaseModel):
    to: str
    message: str
    petId: str
    draftId: Optional[str] = None

class WhatsAppTemplateRequest(BaseModel):
    to: str
    templateName: str
    languageCode: str = "en"
    components: Optional[List[dict]] = None
    petId: Optional[str] = None
    draftId: Optional[str] = None

class WhatsAppInteractiveRequest(BaseModel):
    to: str
    interactive: dict
    petId: Optional[str] = None

class ClinicBootstrapRequest(BaseModel):
    clinicName: str
    fullName: Optional[str] = None


class ScribeNoteRequest(BaseModel):
    transcript: str
    patientName: str
    species: Optional[str] = None


class CareCaseUpdateRequest(BaseModel):
    status: Optional[str] = None
    assignToMe: bool = False


def clinic_phone_number(context: TenantContext) -> str:
    account = get_whatsapp_account(clinic_id=context.clinic_id)
    phone_number_id = (account or {}).get("phone_number_id")
    if not phone_number_id:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp is not connected for this clinic.",
        )
    return phone_number_id


async def process_care_assistant_event(event: dict) -> None:
    """Process one persisted inbound WhatsApp message after webhook acknowledgement."""
    clinic_id = event.get("clinic_id")
    conversation_id = event.get("conversation_id")
    content = (event.get("content") or "").strip()
    if not clinic_id or not conversation_id or not content:
        return

    recent_messages = list_recent_conversation_messages(
        clinic_id,
        conversation_id,
        limit=12,
    )
    assessment = await assess_owner_message(
        message=content,
        recent_messages=recent_messages,
    )
    upsert_care_case(
        clinic_id=clinic_id,
        conversation_id=conversation_id,
        contact_id=event.get("contact_id"),
        inbound_message_id=event.get("message_id"),
        assessment=assessment,
    )
    auto_reply = os.getenv("CARE_ASSISTANT_AUTO_REPLY", "true").strip().lower()
    if auto_reply not in {"1", "true", "yes", "on"}:
        return
    phone_number_id = event.get("phone_number_id")
    to_number = next(
        (
            message.get("from_number")
            for message in reversed(recent_messages)
            if message.get("direction") == "inbound" and message.get("from_number")
        ),
        None,
    )
    if not to_number:
        account_message = event.get("from_number")
        to_number = account_message
    if phone_number_id and to_number and assessment.get("reply"):
        await send_whatsapp_text(
            to_number,
            assessment["reply"],
            phone_number_id=phone_number_id,
            clinic_id=clinic_id,
        )

class CampaignRequest(BaseModel):
    name: str
    message: str
    target: str = "All Patients"

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    
    # Check if Kapso is configured
    kapso_key = os.getenv("KAPSO_API_KEY")
    if not kapso_key or kapso_key == "your_kapso_api_key_here":
        print("WARNING: KAPSO_API_KEY is not set. WhatsApp reminders will not be sent.")
    
    start_telegram_bot()
    print("Kizuna AI Agent Engine is live.")
    yield

app = FastAPI(lifespan=lifespan)

cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/bootstrap")
async def bootstrap_clinic(
    req: ClinicBootstrapRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user),
):
    if len(req.clinicName.strip()) < 2:
        raise HTTPException(status_code=422, detail="Clinic name is required.")
    membership = bootstrap_user_clinic(
        user.user_id,
        user.email,
        req.clinicName,
        req.fullName,
    )
    return membership

@app.get("/api/auth/me")
async def auth_me(context: TenantContext = Depends(get_tenant_context)):
    return {
        "userId": context.user_id,
        "email": context.email,
        "clinicId": context.clinic_id,
        "clinicName": context.clinic_name,
        "role": context.role,
    }

@app.post("/api/pets/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    context: TenantContext = Depends(get_tenant_context),
):
    """Import pets from an Excel file"""
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Standardize column names (basic intelligent mapping)
        mapping = {
            'Pet Name': 'name', 'Pet': 'name', 'Name': 'name',
            'Owner Name': 'ownerName', 'Owner': 'ownerName',
            'Phone': 'ownerPhone', 'Owner Phone': 'ownerPhone', 'WhatsApp': 'ownerPhone',
            'Species': 'species', 'Type': 'species',
            'Breed': 'breed',
            'Age': 'age',
            'Next Visit': 'nextVaccinationDate', 'Next Vax': 'nextVaccinationDate'
        }
        
        df = df.rename(columns=lambda x: mapping.get(x, x))
        
        rows = []
        for _, row in df.iterrows():
            name = str(row.get('name', 'Unknown'))
            owner = str(row.get('ownerName', 'Unknown'))
            phone = str(row.get('ownerPhone', 'Unknown'))
            rows.append({
                "name": name,
                "species": row.get("species", "Dog"),
                "breed": row.get("breed", "Unknown"),
                "age": str(row.get("age", "Unknown")),
                "owner_name": owner,
                "owner_phone": phone,
                "status": "Healthy",
                "next_vaccination_date": str(row.get("nextVaccinationDate", "")),
            })

        count = bulk_insert_pets(context.clinic_id, rows)
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel import failed: {str(e)}")

# ==================== ROUTES ====================

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Kizuna AI Backend is running 🐾"}

@app.get("/api/pets")
async def get_pets(context: TenantContext = Depends(get_tenant_context)):
    return db_list_pets(context.clinic_id)


@app.post("/api/scribe/generate-note")
async def generate_scribe_note(
    req: ScribeNoteRequest,
    context: TenantContext = Depends(
        require_roles("owner", "admin", "veterinarian", "nurse")
    ),
):
    if len(req.transcript.strip()) < 20:
        raise HTTPException(status_code=422, detail="Transcript is too short.")
    note = await generate_clinical_note(
        transcript=req.transcript.strip(),
        patient_name=req.patientName.strip(),
        species=req.species,
    )
    return {
        "clinicId": context.clinic_id,
        "status": "draft",
        "requiresClinicianReview": True,
        "note": note,
    }


@app.post("/api/scribe/transcribe")
async def transcribe_consultation(
    file: UploadFile = File(...),
    context: TenantContext = Depends(
        require_roles("owner", "admin", "veterinarian", "nurse")
    ),
):
    contents = await file.read()
    max_bytes = int(os.getenv("SCRIBE_AUDIO_MAX_BYTES", str(100 * 1024 * 1024)))
    if not contents:
        raise HTTPException(status_code=422, detail="Audio file is empty.")
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large.")
    try:
        result = await transcribe_wav(contents)
    except TranscriptionConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TranscriptionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"clinicId": context.clinic_id, **result}


@app.post("/api/pets")
async def create_pet(
    pet: PetRequest,
    context: TenantContext = Depends(get_tenant_context),
):
    return db_create_pet(context.clinic_id, pet.model_dump())

@app.delete("/api/pets/{pet_id}")
async def delete_pet(
    pet_id: str,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian")),
):
    deleted = db_delete_pet(context.clinic_id, pet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return {"status": "success"}

@app.get("/api/campaigns")
async def list_campaigns(context: TenantContext = Depends(get_tenant_context)):
    return db_list_campaigns(context.clinic_id)

@app.post("/api/campaigns")
async def create_campaign(
    req: CampaignRequest,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian")),
):
    campaign = db_create_campaign(context.clinic_id, req.name, req.message, req.target)
    target_pets = list_target_pets(context.clinic_id, req.target)

    for pet in target_pets:
        msg = req.message.replace("{owner_name}", pet["owner_name"]).replace("{pet_name}", pet["name"])
        db_create_draft(context.clinic_id, pet["id"], "campaign", msg, "pending_review")

    return {"status": "success", "campaign_id": campaign["id"], "drafts_created": len(target_pets)}

# ==================== REMINDERS ====================

@app.post("/api/reminders/generate")
async def generate_reminder_route(
    req: ReminderGenerateRequest,
    context: TenantContext = Depends(get_tenant_context),
):
    """Generate a personalized AI message using Gemini"""
    message = await generate_reminder(
        req.petName, req.ownerName, req.clinicName, req.type, req.bookingUrl, req.tone
    )
    return {"message": message}

@app.post("/api/reminders/send")
async def send_reminder_route(
    req: ReminderSendRequest,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian", "nurse", "receptionist")),
):
    """Send a WhatsApp message via Kapso"""
    try:
        if not pet_belongs_to_clinic(context.clinic_id, req.petId):
            raise HTTPException(status_code=404, detail="Patient not found.")
        result = await send_whatsapp_reminder(
            req.to,
            req.message,
            phone_number_id=clinic_phone_number(context),
            clinic_id=context.clinic_id,
            pet_id=req.petId,
            draft_id=req.draftId,
        )
        return {
            "success": True,
            "messageId": result.get("message_id"),
            "to": result.get("to"),
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except KapsoConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KapsoAPIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=str(exc),
        ) from exc

@app.post("/api/whatsapp/send-template")
async def send_template_route(
    req: WhatsAppTemplateRequest,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian", "nurse", "receptionist")),
):
    """Send a Meta-approved WhatsApp template through Kapso."""
    try:
        if req.petId and not pet_belongs_to_clinic(context.clinic_id, req.petId):
            raise HTTPException(status_code=404, detail="Patient not found.")
        return await send_whatsapp_template(
            req.to,
            template_name=req.templateName,
            language_code=req.languageCode,
            components=req.components,
            phone_number_id=clinic_phone_number(context),
            clinic_id=context.clinic_id,
            pet_id=req.petId,
            draft_id=req.draftId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except KapsoConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KapsoAPIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=str(exc),
        ) from exc

@app.post("/api/whatsapp/send-interactive")
async def send_interactive_route(
    req: WhatsAppInteractiveRequest,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian", "nurse", "receptionist")),
):
    """Send buttons, lists, CTA URLs, or WhatsApp Flows inside an open window."""
    try:
        if req.petId and not pet_belongs_to_clinic(context.clinic_id, req.petId):
            raise HTTPException(status_code=404, detail="Patient not found.")
        return await send_whatsapp_interactive(
            req.to,
            interactive=req.interactive,
            phone_number_id=clinic_phone_number(context),
            clinic_id=context.clinic_id,
            pet_id=req.petId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except KapsoConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KapsoAPIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=str(exc),
        ) from exc

@app.post("/api/webhooks/kapso")
async def kapso_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive signed Kapso v2 WhatsApp and connection events."""
    raw_payload = await request.body()
    signature = request.headers.get("X-Webhook-Signature")
    if not verify_kapso_signature(raw_payload, signature):
        raise HTTPException(status_code=401, detail="Invalid Kapso webhook signature.")

    idempotency_key = request.headers.get("X-Idempotency-Key")
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Missing X-Idempotency-Key header.")

    try:
        payload = await request.json()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Webhook body must be valid JSON.") from exc

    event_type = (
        request.headers.get("X-Webhook-Event")
        or payload.get("event")
        or payload.get("type")
    )
    if not event_type:
        raise HTTPException(status_code=400, detail="Missing Kapso event type.")

    try:
        result = process_kapso_webhook(
            event_type=event_type,
            idempotency_key=idempotency_key,
            payload=payload,
        )
        for event in result.pop("assistant_events", []):
            background_tasks.add_task(process_care_assistant_event, event)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Webhook processing failed.") from exc
    return {"received": True, **result}


@app.get("/api/care/cases")
async def get_care_cases(
    limit: int = 50,
    context: TenantContext = Depends(get_tenant_context),
):
    safe_limit = min(max(limit, 1), 100)
    return list_care_cases(context.clinic_id, safe_limit)


@app.patch("/api/care/cases/{care_case_id}")
async def patch_care_case(
    care_case_id: str,
    req: CareCaseUpdateRequest,
    context: TenantContext = Depends(
        require_roles("owner", "admin", "veterinarian", "nurse", "receptionist")
    ),
):
    allowed_statuses = {"open", "needs_human", "in_review", "resolved", "closed"}
    if req.status is not None and req.status not in allowed_statuses:
        raise HTTPException(status_code=422, detail="Invalid care case status.")
    care_case = update_care_case(
        context.clinic_id,
        care_case_id,
        status=req.status,
        assigned_to=context.user_id if req.assignToMe else None,
    )
    if not care_case:
        raise HTTPException(status_code=404, detail="Care case not found.")
    return care_case


@app.get("/api/whatsapp/conversations")
async def get_whatsapp_conversations(
    limit: int = 50,
    context: TenantContext = Depends(get_tenant_context),
):
    safe_limit = min(max(limit, 1), 100)
    return list_whatsapp_conversations(context.clinic_id, safe_limit)

# ==================== AI AGENT DRAFTS ====================

@app.get("/api/agent/drafts")
async def get_all_drafts(context: TenantContext = Depends(get_tenant_context)):
    return db_list_pending_drafts(context.clinic_id)

@app.post("/api/agent/process-draft")
async def process_draft(
    action: DraftAction,
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian")),
):
    if action.approved:
        draft = get_draft_with_owner_phone(context.clinic_id, action.draftId)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found.")
        try:
            result = await send_whatsapp_reminder(
                draft["owner_phone"],
                action.message or draft["draft_message"],
                phone_number_id=clinic_phone_number(context),
                clinic_id=context.clinic_id,
                pet_id=draft.get("pet_id"),
                draft_id=action.draftId,
            )
        except (ValueError, KapsoConfigurationError, KapsoAPIError) as exc:
            update_draft_status(context.clinic_id, action.draftId, "send_failed")
            status_code = exc.status_code if isinstance(exc, KapsoAPIError) else None
            raise HTTPException(
                status_code=status_code or 502,
                detail=str(exc),
            ) from exc
        update_draft_status(context.clinic_id, action.draftId, "sent")
        return {"status": "success", "messageId": result.get("message_id")}
    else:
        update_draft_status(context.clinic_id, action.draftId, "rejected")
    return {"status": "success"}

@app.post("/api/insights")
async def get_insights(
    request: InsightsRequest,
    context: TenantContext = Depends(get_tenant_context),
):
    summary = await get_analytics_summary(request.stats)
    return {"summary": summary}

@app.post("/api/agent/generate-auto-wishes")
async def generate_auto_wishes(
    context: TenantContext = Depends(require_roles("owner", "admin", "veterinarian")),
):
    """AI Agent automatically generates wellness check drafts for all pets"""
    pets = list_target_pets(context.clinic_id, "All Patients")
    
    count = 0
    for pet in pets:
        message = f"🌟 Hello {pet['owner_name']}! We're thinking of {pet['name']} today. Just a quick note from Kizuna Vet Center to wish you both a healthy and happy week! 🐾✨"
        db_create_draft(context.clinic_id, pet["id"], "wellness_wish", message, "pending_review")
        count += 1

    return {"status": "success", "drafts_created": count}

@app.get("/api/settings")
async def get_settings(context: TenantContext = Depends(get_tenant_context)):
    return db_list_settings(context.clinic_id)

@app.post("/api/settings")
async def update_settings(
    settings: dict = Body(...),
    context: TenantContext = Depends(require_roles("owner", "admin")),
):
    db_upsert_settings(context.clinic_id, settings)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
