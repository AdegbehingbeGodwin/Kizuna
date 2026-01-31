"""
Kizuna AI Agent Backend - Python/FastAPI
Enhanced Pet Profiles & AI Service
"""

import os
import uuid
import json
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
if not os.path.exists(ENV_PATH):
    print(f"🚨 CRITICAL WARNING: .env file NOT FOUND at {ENV_PATH}")
else:
    print(f"✅ Found .env at {ENV_PATH}")
load_dotenv(ENV_PATH, override=True)

from services.sqlite_db import init_db, get_db_connection
from services.gemini import generate_reminder, get_analytics_summary
from services.kapso import send_whatsapp_reminder
from services.telegram_bot import start_telegram_bot

import pandas as pd
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
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
        print("⚠️ KAPSO_API_KEY is not set. WhatsApp reminders will not be sent.")
    
    start_telegram_bot()
    print("🐾 Kizuna AI Agent Engine is live!")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/pets/import-excel")
async def import_excel(file: UploadFile = File(...)):
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
        
        conn = get_db_connection()
        count = 0
        for _, row in df.iterrows():
            new_id = str(uuid.uuid4())
            # Basic validation/defaults
            name = str(row.get('name', 'Unknown'))
            owner = str(row.get('ownerName', 'Unknown'))
            phone = str(row.get('ownerPhone', 'Unknown'))
            
            conn.execute(
                """INSERT INTO pets (id, name, species, breed, age, owner_name, owner_phone, status, next_vaccination_date) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (new_id, name, row.get('species', 'Dog'), row.get('breed', 'Unknown'), str(row.get('age', 'Unknown')), owner, phone, 'Healthy', str(row.get('nextVaccinationDate', '')))
            )
            count += 1
            
        conn.commit()
        conn.close()
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel import failed: {str(e)}")

# --- Helper: Map DB to Frontend ---
def map_pet(p):
    return {
        "id": p["id"],
        "name": p["name"],
        "species": p["species"],
        "breed": p.get("breed", "Unknown"),
        "sex": p.get("sex", "Unknown"),
        "color": p.get("color", "Unknown"),
        "age": p.get("age", "Unknown"),
        "weight": p.get("weight", "Unknown"),
        "ownerName": p["owner_name"],
        "ownerPhone": p["owner_phone"],
        "status": p.get("status", "Healthy"),
        "birthday": p.get("birthday"),
        "lastVaccinationDate": p.get("last_vaccination_date"),
        "nextVaccinationDate": p.get("next_vaccination_date") or datetime.now().strftime("%Y-%m-%d"),
        "lastDewormingDate": p.get("last_deworming_date"),
        "lastCheckupDate": p.get("last_checkup_date")
    }

# ==================== ROUTES ====================

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Kizuna AI Backend is running 🐾"}

@app.get("/api/pets")
async def get_pets():
    conn = get_db_connection()
    pets = conn.execute("SELECT * FROM pets ORDER BY created_at DESC").fetchall()
    conn.close()
    return [map_pet(dict(p)) for p in pets]

@app.post("/api/pets")
async def create_pet(pet: PetRequest):
    new_id = str(uuid.uuid4())
    conn = get_db_connection()
    conn.execute(
        """INSERT INTO pets (id, name, species, breed, sex, color, age, weight, owner_name, owner_phone, status, birthday, last_vaccination_date, next_vaccination_date, last_deworming_date, last_checkup_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (new_id, pet.name, pet.species, pet.breed, pet.sex, pet.color, pet.age, pet.weight, pet.ownerName, pet.ownerPhone, pet.status, pet.birthday, pet.lastVaccinationDate, pet.nextVaccinationDate, pet.lastDewormingDate, pet.lastCheckupDate)
    )
    conn.commit()
    conn.close()
    return {**pet.dict(), "id": new_id}

@app.delete("/api/pets/{pet_id}")
async def delete_pet(pet_id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM pets WHERE id = ?", (pet_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/campaigns")
async def list_campaigns():
    conn = get_db_connection()
    campaigns = conn.execute("SELECT * FROM campaigns ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(c) for c in campaigns]

@app.post("/api/campaigns")
async def create_campaign(req: CampaignRequest):
    campaign_id = str(uuid.uuid4())
    conn = get_db_connection()
    
    # 1. Save Campaign
    conn.execute(
        "INSERT INTO campaigns (id, name, message, target_audience, status) VALUES (?, ?, ?, ?, ?)",
        (campaign_id, req.name, req.message, req.target, 'active')
    )
    
    # 2. Identify Target Pets
    query = "SELECT * FROM pets"
    params = []
    
    if req.target == "Dogs Only":
        query += " WHERE species = ?"
        params = ["Dog"]
    elif req.target == "Cats Only":
        query += " WHERE species = ?"
        params = ["Cat"]
    elif req.target == "Overdue Patients":
        query += " WHERE status = ?"
        params = ["Overdue"]
    elif req.target == "Due This Month":
        current_month = datetime.now().strftime("%Y-%m")
        query += " WHERE next_vaccination_date LIKE ?"
        params = [f"{current_month}%"]
    
    target_pets = conn.execute(query, params).fetchall()
    
    # 3. Generate Drafts for each target pet
    for pet in target_pets:
        draft_id = str(uuid.uuid4())
        # Personalization
        msg = req.message.replace("{owner_name}", pet['owner_name']).replace("{pet_name}", pet['name'])
        
        conn.execute(
            "INSERT INTO drafts (id, pet_id, type, draft_message, status) VALUES (?, ?, ?, ?, ?)",
            (draft_id, pet['id'], 'campaign', msg, 'pending_review')
        )
    
    conn.commit()
    conn.close()
    return {"status": "success", "campaign_id": campaign_id, "drafts_created": len(target_pets)}

# ==================== REMINDERS ====================

@app.post("/api/reminders/generate")
async def generate_reminder_route(req: ReminderGenerateRequest):
    """Generate a personalized AI message using Gemini"""
    message = await generate_reminder(
        req.petName, req.ownerName, req.clinicName, req.type, req.bookingUrl, req.tone
    )
    return {"message": message}

@app.post("/api/reminders/send")
async def send_reminder_route(req: ReminderSendRequest):
    """Send a WhatsApp message via Kapso"""
    result = await send_whatsapp_reminder(req.to, req.message)
    if result.get("success"):
        return {"success": True, "sid": result.get("sid")}
    else:
        raise HTTPException(status_code=500, detail=result.get("error"))

# ==================== AI AGENT DRAFTS ====================

@app.get("/api/agent/drafts")
async def get_all_drafts():
    conn = get_db_connection()
    query = """
    SELECT d.*, p.name as pet_name, p.owner_name, p.owner_phone 
    FROM drafts d 
    JOIN pets p ON d.pet_id = p.id 
    WHERE d.status = 'pending_review'
    ORDER BY d.created_at DESC
    """
    drafts = conn.execute(query).fetchall()
    conn.close()
    return [dict(d) for d in drafts]

@app.post("/api/agent/process-draft")
async def process_draft(action: DraftAction):
    conn = get_db_connection()
    if action.approved:
        draft = conn.execute(
            "SELECT d.*, p.owner_phone FROM drafts d JOIN pets p ON d.pet_id = p.id WHERE d.id = ?", 
            (action.draftId,)
        ).fetchone()
        if draft:
            await send_whatsapp_reminder(draft['owner_phone'], action.message or draft['draft_message'])
            conn.execute("UPDATE drafts SET status = 'sent' WHERE id = ?", (action.draftId,))
    else:
        conn.execute("UPDATE drafts SET status = 'rejected' WHERE id = ?", (action.draftId,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/insights")
async def get_insights(request: InsightsRequest):
    summary = await get_analytics_summary(request.stats)
    return {"summary": summary}

@app.post("/api/agent/generate-auto-wishes")
async def generate_auto_wishes():
    """AI Agent automatically generates wellness check drafts for all pets"""
    conn = get_db_connection()
    pets = conn.execute("SELECT * FROM pets").fetchall()
    
    count = 0
    for pet in pets:
        draft_id = str(uuid.uuid4())
        message = f"🌟 Hello {pet['owner_name']}! We're thinking of {pet['name']} today. Just a quick note from Kizuna Vet Center to wish you both a healthy and happy week! 🐾✨"
        
        conn.execute(
            "INSERT INTO drafts (id, pet_id, type, draft_message, status) VALUES (?, ?, ?, ?, ?)",
            (draft_id, pet['id'], 'wellness_wish', message, 'pending_review')
        )
        count += 1
        
    conn.commit()
    conn.close()
    return {"status": "success", "drafts_created": count}

@app.get("/api/settings")
async def get_settings():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM settings").fetchall()
    conn.close()
    return {row['key']: row['value'] for row in rows}

@app.post("/api/settings")
async def update_settings(settings: dict = Body(...)):
    conn = get_db_connection()
    for key, value in settings.items():
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, str(value))
        )
    conn.commit()
    conn.close()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
