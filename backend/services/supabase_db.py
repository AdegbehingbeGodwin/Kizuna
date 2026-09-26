import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import Client, create_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

_client: Optional[Client] = None


def _nullable_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "null"}:
        return None
    return text


def get_supabase() -> Client:
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

    _client = create_client(url, key)
    return _client


def init_db() -> None:
    # Verifies credentials early during app startup.
    client = get_supabase()
    try:
        client.table("clinics").select("id").limit(1).execute()
    except APIError as exc:
        msg = str(exc)
        if "Could not find the table 'public.clinics'" in msg:
            raise RuntimeError(
                "Supabase schema is missing. Run docs/supabase_schema.sql in your Supabase SQL editor."
            ) from exc
        raise


def map_pet_row(p: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": p["id"],
        "name": p["name"],
        "species": p.get("species"),
        "breed": p.get("breed") or "Unknown",
        "sex": p.get("sex") or "Unknown",
        "color": p.get("color") or "Unknown",
        "age": p.get("age") or "Unknown",
        "weight": p.get("weight") or "Unknown",
        "ownerName": p.get("owner_name"),
        "ownerPhone": p.get("owner_phone"),
        "status": p.get("status") or "Healthy",
        "birthday": p.get("birthday"),
        "lastVaccinationDate": p.get("last_vaccination_date"),
        "nextVaccinationDate": p.get("next_vaccination_date"),
        "lastDewormingDate": p.get("last_deworming_date"),
        "lastCheckupDate": p.get("last_checkup_date"),
    }


def get_user_membership(user_id: str) -> Optional[Dict[str, Any]]:
    result = (
        get_supabase()
        .table("clinic_memberships")
        .select("clinic_id,role,status,clinics(id,name,slug)")
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


def bootstrap_user_clinic(
    user_id: str,
    email: Optional[str],
    clinic_name: str,
    full_name: Optional[str] = None,
) -> Dict[str, Any]:
    existing = get_user_membership(user_id)
    if existing:
        return existing

    client = get_supabase()
    legacy_membership_count = (
        client.table("clinic_memberships")
        .select("id", count="exact")
        .eq("clinic_id", "00000000-0000-0000-0000-000000000001")
        .limit(1)
        .execute()
    )
    legacy_owner_email = os.getenv("LEGACY_CLINIC_OWNER_EMAIL", "").strip().lower()
    may_claim_legacy = (
        (legacy_membership_count.count or 0) == 0
        and bool(legacy_owner_email)
        and bool(email)
        and email.lower() == legacy_owner_email
    )

    if may_claim_legacy:
        clinic_id = "00000000-0000-0000-0000-000000000001"
        client.table("clinics").update(
            {
                "name": clinic_name.strip(),
                "slug": _unique_slug(clinic_name),
                "created_by": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", clinic_id).execute()
        client.table("clinic_settings").upsert(
            {
                "clinic_id": clinic_id,
                "key": "clinic_name",
                "value": clinic_name.strip(),
            },
            on_conflict="clinic_id,key",
        ).execute()
    else:
        clinic_id = str(uuid.uuid4())
        client.table("clinics").insert(
            {
                "id": clinic_id,
                "name": clinic_name.strip(),
                "slug": _unique_slug(clinic_name),
                "created_by": user_id,
            }
        ).execute()
        client.table("clinic_settings").insert(
            [
                {"clinic_id": clinic_id, "key": "clinic_name", "value": clinic_name.strip()},
                {"clinic_id": clinic_id, "key": "booking_url", "value": ""},
                {"clinic_id": clinic_id, "key": "ai_tone", "value": "friendly"},
            ]
        ).execute()

    client.table("profiles").upsert(
        {
            "user_id": user_id,
            "full_name": full_name or (email.split("@")[0] if email else None),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()
    client.table("clinic_memberships").insert(
        {
            "clinic_id": clinic_id,
            "user_id": user_id,
            "role": "owner",
            "status": "active",
        }
    ).execute()
    membership = get_user_membership(user_id)
    if not membership:
        raise RuntimeError("Failed to create clinic membership.")
    return membership


def _unique_slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "clinic"
    return f"{base}-{uuid.uuid4().hex[:8]}"


def list_pets(clinic_id: str) -> List[Dict[str, Any]]:
    res = (
        get_supabase()
        .table("pets")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []
    return [map_pet_row(r) for r in rows]


def create_pet(clinic_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    to_insert = {
        "clinic_id": clinic_id,
        "name": payload["name"],
        "species": payload.get("species"),
        "breed": payload.get("breed"),
        "sex": payload.get("sex"),
        "color": payload.get("color"),
        "age": payload.get("age"),
        "weight": payload.get("weight"),
        "owner_name": payload["ownerName"],
        "owner_phone": payload["ownerPhone"],
        "status": payload.get("status"),
        "birthday": _nullable_date(payload.get("birthday")),
        "last_vaccination_date": _nullable_date(payload.get("lastVaccinationDate")),
        "next_vaccination_date": _nullable_date(payload.get("nextVaccinationDate")),
        "last_deworming_date": _nullable_date(payload.get("lastDewormingDate")),
        "last_checkup_date": _nullable_date(payload.get("lastCheckupDate")),
    }
    res = get_supabase().table("pets").insert(to_insert).execute()
    data = res.data or []
    if not data:
        raise RuntimeError("Failed to create pet")
    return map_pet_row(data[0])


def bulk_insert_pets(clinic_id: str, rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0
    normalized = []
    for row in rows:
        normalized.append(
            {
                "clinic_id": clinic_id,
                **row,
                "birthday": _nullable_date(row.get("birthday")),
                "last_vaccination_date": _nullable_date(row.get("last_vaccination_date")),
                "next_vaccination_date": _nullable_date(row.get("next_vaccination_date")),
                "last_deworming_date": _nullable_date(row.get("last_deworming_date")),
                "last_checkup_date": _nullable_date(row.get("last_checkup_date")),
            }
        )
    res = get_supabase().table("pets").insert(normalized).execute()
    return len(res.data or [])


def delete_pet(clinic_id: str, pet_id: str) -> bool:
    result = (
        get_supabase()
        .table("pets")
        .delete()
        .eq("clinic_id", clinic_id)
        .eq("id", pet_id)
        .execute()
    )
    return bool(result.data)


def list_campaigns(clinic_id: str) -> List[Dict[str, Any]]:
    res = (
        get_supabase()
        .table("campaigns")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def create_campaign(clinic_id: str, name: str, message: str, target: str) -> Dict[str, Any]:
    res = (
        get_supabase()
        .table("campaigns")
        .insert(
            {
                "clinic_id": clinic_id,
                "name": name,
                "message": message,
                "target_audience": target,
                "status": "active",
            }
        )
        .execute()
    )
    data = res.data or []
    if not data:
        raise RuntimeError("Failed to create campaign")
    return data[0]


def list_target_pets(clinic_id: str, target: str) -> List[Dict[str, Any]]:
    q = get_supabase().table("pets").select("*").eq("clinic_id", clinic_id)
    if target == "Dogs Only":
        q = q.eq("species", "Dog")
    elif target == "Cats Only":
        q = q.eq("species", "Cat")
    elif target == "Overdue Patients":
        q = q.eq("status", "Overdue")
    elif target == "Due This Month":
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).date().isoformat()
        if now.month == 12:
            next_month = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            next_month = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
        month_end = next_month.date().isoformat()
        q = q.gte("next_vaccination_date", month_start).lt("next_vaccination_date", month_end)
    res = q.execute()
    return res.data or []


def create_draft(
    clinic_id: str,
    pet_id: str,
    draft_type: str,
    message: str,
    status: str = "pending_review",
) -> None:
    get_supabase().table("drafts").insert(
        {
            "clinic_id": clinic_id,
            "pet_id": pet_id,
            "type": draft_type,
            "draft_message": message,
            "status": status,
        }
    ).execute()


def list_pending_drafts(clinic_id: str) -> List[Dict[str, Any]]:
    drafts_res = (
        get_supabase()
        .table("drafts")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("status", "pending_review")
        .order("created_at", desc=True)
        .execute()
    )
    drafts = drafts_res.data or []
    if not drafts:
        return []

    pet_ids = [d["pet_id"] for d in drafts if d.get("pet_id")]
    pets_res = (
        get_supabase()
        .table("pets")
        .select("id,name,owner_name,owner_phone")
        .eq("clinic_id", clinic_id)
        .in_("id", pet_ids)
        .execute()
    )
    pets = {p["id"]: p for p in (pets_res.data or [])}

    merged = []
    for d in drafts:
        pet = pets.get(d.get("pet_id"), {})
        merged.append(
            {
                **d,
                "pet_name": pet.get("name"),
                "owner_name": pet.get("owner_name"),
                "owner_phone": pet.get("owner_phone"),
            }
        )
    return merged


def get_draft_with_owner_phone(clinic_id: str, draft_id: str) -> Optional[Dict[str, Any]]:
    draft_res = (
        get_supabase()
        .table("drafts")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", draft_id)
        .limit(1)
        .execute()
    )
    drafts = draft_res.data or []
    if not drafts:
        return None
    draft = drafts[0]

    pet_res = (
        get_supabase()
        .table("pets")
        .select("id,owner_phone")
        .eq("clinic_id", clinic_id)
        .eq("id", draft.get("pet_id"))
        .limit(1)
        .execute()
    )
    pets = pet_res.data or []
    owner_phone = pets[0]["owner_phone"] if pets else None
    return {**draft, "owner_phone": owner_phone}


def update_draft_status(clinic_id: str, draft_id: str, status: str) -> None:
    (
        get_supabase()
        .table("drafts")
        .update({"status": status})
        .eq("clinic_id", clinic_id)
        .eq("id", draft_id)
        .execute()
    )


def list_settings(clinic_id: str) -> Dict[str, str]:
    res = (
        get_supabase()
        .table("clinic_settings")
        .select("key,value")
        .eq("clinic_id", clinic_id)
        .execute()
    )
    rows = res.data or []
    return {r["key"]: r["value"] for r in rows}


def upsert_settings(clinic_id: str, settings: Dict[str, Any]) -> None:
    blocked_keys = {
        "kapso_api_key",
        "kapso_phone_id",
        "telegram_token",
        "gemini_api_key",
        "supabase_service_role_key",
    }
    rows = [
        {"clinic_id": clinic_id, "key": key, "value": str(value)}
        for key, value in settings.items()
        if key.lower() not in blocked_keys
    ]
    if not rows:
        return
    get_supabase().table("clinic_settings").upsert(
        rows, on_conflict="clinic_id,key"
    ).execute()


def get_whatsapp_account(
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    query = get_supabase().table("whatsapp_accounts").select("*")
    if clinic_id:
        query = query.eq("clinic_id", clinic_id)
    if phone_number_id:
        query = query.eq("phone_number_id", phone_number_id)
    if not phone_number_id and not clinic_id:
        query = query.eq("is_default", True)
    result = query.limit(1).execute()
    rows = result.data or []
    return rows[0] if rows else None


def upsert_whatsapp_account(
    phone_number_id: str,
    clinic_id: Optional[str] = None,
    **fields: Any,
) -> Dict[str, Any]:
    payload = {
        "phone_number_id": phone_number_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **{key: value for key, value in fields.items() if value is not None},
    }
    if clinic_id is not None:
        payload["clinic_id"] = clinic_id
    result = (
        get_supabase()
        .table("whatsapp_accounts")
        .upsert(payload, on_conflict="phone_number_id")
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise RuntimeError("Failed to save WhatsApp account")
    return rows[0]


def create_outbound_whatsapp_message(
    *,
    phone_number_id: str,
    to_number: str,
    message_type: str,
    content: Optional[str],
    whatsapp_message_id: Optional[str],
    raw_payload: Dict[str, Any],
    status: str = "sent",
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
    draft_id: Optional[str] = None,
    template_name: Optional[str] = None,
) -> Dict[str, Any]:
    account = get_whatsapp_account(phone_number_id=phone_number_id)
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "clinic_id": clinic_id or (account or {}).get("clinic_id"),
        "whatsapp_account_id": (account or {}).get("id"),
        "pet_id": pet_id,
        "draft_id": draft_id,
        "whatsapp_message_id": whatsapp_message_id,
        "direction": "outbound",
        "message_type": message_type,
        "status": status,
        "to_number": to_number,
        "content": content,
        "template_name": template_name,
        "raw_payload": raw_payload,
        "sent_at": now if status == "sent" else None,
        "failed_at": now if status == "failed" else None,
        "updated_at": now,
    }
    result = get_supabase().table("whatsapp_messages").insert(payload).execute()
    rows = result.data or []
    return rows[0] if rows else payload


def record_whatsapp_webhook_event(
    *,
    idempotency_key: str,
    event_type: str,
    phone_number_id: Optional[str],
    payload: Dict[str, Any],
) -> bool:
    existing = (
        get_supabase()
        .table("whatsapp_webhook_events")
        .select("id")
        .eq("idempotency_key", idempotency_key)
        .limit(1)
        .execute()
    )
    if existing.data:
        return False

    get_supabase().table("whatsapp_webhook_events").insert(
        {
            "idempotency_key": idempotency_key,
            "event_type": event_type,
            "phone_number_id": phone_number_id,
            "payload": payload,
        }
    ).execute()
    return True


def mark_whatsapp_webhook_processed(
    idempotency_key: str,
    error: Optional[str] = None,
) -> None:
    get_supabase().table("whatsapp_webhook_events").update(
        {
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processing_error": error,
        }
    ).eq("idempotency_key", idempotency_key).execute()


def upsert_whatsapp_contact(
    *,
    clinic_id: Optional[str],
    phone_number: Optional[str],
    business_scoped_user_id: Optional[str],
    parent_business_scoped_user_id: Optional[str] = None,
    username: Optional[str] = None,
    display_name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    if not phone_number and not business_scoped_user_id:
        return None

    table = get_supabase().table("whatsapp_contacts")
    existing_query = table.select("*")
    if business_scoped_user_id:
        existing_query = existing_query.eq(
            "business_scoped_user_id", business_scoped_user_id
        )
    else:
        existing_query = existing_query.eq("phone_number", phone_number)
    if clinic_id:
        existing_query = existing_query.eq("clinic_id", clinic_id)
    existing_result = existing_query.limit(1).execute()
    existing = (existing_result.data or [None])[0]

    payload = {
        "clinic_id": clinic_id,
        "phone_number": phone_number,
        "business_scoped_user_id": business_scoped_user_id,
        "parent_business_scoped_user_id": parent_business_scoped_user_id,
        "username": username,
        "display_name": display_name,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if metadata is not None:
        payload["metadata"] = metadata
    if existing:
        result = table.update(
            {key: value for key, value in payload.items() if value is not None}
        ).eq("id", existing["id"]).execute()
    else:
        result = table.insert(payload).execute()
    rows = result.data or []
    return rows[0] if rows else existing


def record_care_channel_inbound(
    *,
    clinic_id: str,
    channel: str,
    external_user_id: str,
    external_conversation_id: str,
    external_message_id: str,
    content: str,
    display_name: Optional[str] = None,
    username: Optional[str] = None,
    raw_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Persist a non-WhatsApp intake in the existing care conversation store."""
    contact = upsert_whatsapp_contact(
        clinic_id=clinic_id,
        phone_number=None,
        business_scoped_user_id=f"{channel}:{external_user_id}",
        username=username,
        display_name=display_name,
        metadata={"channel": channel, "external_user_id": external_user_id},
    )
    conversation = upsert_whatsapp_conversation(
        external_conversation_id=f"{channel}:{external_conversation_id}",
        account_id=None,
        contact_id=(contact or {}).get("id"),
        clinic_id=clinic_id,
        metadata={"channel": channel},
    )
    message = upsert_inbound_whatsapp_message(
        whatsapp_message_id=f"{channel}:{external_message_id}",
        phone_number_id=None,
        from_number=f"{channel}:{external_user_id}",
        message_type="text",
        content=content,
        status="received",
        raw_payload={"channel": channel, **(raw_payload or {})},
        contact=contact,
        conversation=conversation,
        clinic_id=clinic_id,
    )
    return {"contact": contact, "conversation": conversation, "message": message}


def record_care_channel_outbound(
    *,
    clinic_id: str,
    channel: str,
    external_user_id: str,
    external_message_id: str,
    content: str,
    contact_id: Optional[str],
    conversation_id: str,
    raw_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "clinic_id": clinic_id,
        "conversation_id": conversation_id,
        "contact_id": contact_id,
        "whatsapp_message_id": f"{channel}:{external_message_id}",
        "direction": "outbound",
        "message_type": "text",
        "status": "sent",
        "to_number": f"{channel}:{external_user_id}",
        "content": content,
        "raw_payload": {"channel": channel, **(raw_payload or {})},
        "sent_at": now,
        "updated_at": now,
    }
    result = get_supabase().table("whatsapp_messages").insert(payload).execute()
    rows = result.data or []
    return rows[0] if rows else payload


def upsert_whatsapp_conversation(
    *,
    external_conversation_id: Optional[str],
    account_id: Optional[str],
    contact_id: Optional[str],
    clinic_id: Optional[str],
    status: str = "open",
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    if not external_conversation_id and not contact_id:
        return None

    table = get_supabase().table("whatsapp_conversations")
    existing = None
    if external_conversation_id:
        result = (
            table.select("*")
            .eq("external_conversation_id", external_conversation_id)
            .limit(1)
            .execute()
        )
        existing = (result.data or [None])[0]

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "clinic_id": clinic_id,
        "whatsapp_account_id": account_id,
        "contact_id": contact_id,
        "external_conversation_id": external_conversation_id,
        "status": status,
        "last_message_at": now,
        "metadata": metadata or {},
        "updated_at": now,
    }
    if existing:
        result = table.update(
            {key: value for key, value in payload.items() if value is not None}
        ).eq("id", existing["id"]).execute()
    else:
        result = table.insert(payload).execute()
    rows = result.data or []
    return rows[0] if rows else existing


def upsert_inbound_whatsapp_message(
    *,
    whatsapp_message_id: Optional[str],
    phone_number_id: Optional[str],
    from_number: Optional[str],
    message_type: str,
    content: Optional[str],
    status: str,
    raw_payload: Dict[str, Any],
    contact: Optional[Dict[str, Any]],
    conversation: Optional[Dict[str, Any]],
    clinic_id: Optional[str],
) -> Dict[str, Any]:
    account = (
        get_whatsapp_account(phone_number_id=phone_number_id)
        if phone_number_id
        else None
    )
    payload = {
        "clinic_id": clinic_id,
        "whatsapp_account_id": (account or {}).get("id"),
        "conversation_id": (conversation or {}).get("id"),
        "contact_id": (contact or {}).get("id"),
        "whatsapp_message_id": whatsapp_message_id,
        "direction": "inbound",
        "message_type": message_type,
        "status": status,
        "from_number": from_number,
        "content": content,
        "raw_payload": raw_payload,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    table = get_supabase().table("whatsapp_messages")
    if whatsapp_message_id:
        result = table.upsert(payload, on_conflict="whatsapp_message_id").execute()
    else:
        result = table.insert(payload).execute()
    rows = result.data or []
    return rows[0] if rows else payload


def update_whatsapp_message_status(
    whatsapp_message_id: str,
    status: str,
    raw_payload: Dict[str, Any],
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    payload: Dict[str, Any] = {
        "status": status,
        "raw_payload": raw_payload,
        "error_code": error_code,
        "error_message": error_message,
        "updated_at": now,
    }
    timestamp_column = {
        "sent": "sent_at",
        "delivered": "delivered_at",
        "read": "read_at",
        "failed": "failed_at",
    }.get(status)
    if timestamp_column:
        payload[timestamp_column] = now
    get_supabase().table("whatsapp_messages").update(payload).eq(
        "whatsapp_message_id", whatsapp_message_id
    ).execute()


def list_whatsapp_conversations(
    clinic_id: str,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    result = (
        get_supabase()
        .table("whatsapp_conversations")
        .select("*,whatsapp_contacts(*)")
        .eq("clinic_id", clinic_id)
        .order("last_message_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def list_recent_conversation_messages(
    clinic_id: str,
    conversation_id: str,
    limit: int = 12,
) -> List[Dict[str, Any]]:
    result = (
        get_supabase()
        .table("whatsapp_messages")
        .select("id,direction,message_type,content,status,from_number,to_number,created_at")
        .eq("clinic_id", clinic_id)
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(result.data or []))


def upsert_care_case(
    *,
    clinic_id: str,
    conversation_id: str,
    contact_id: Optional[str],
    inbound_message_id: Optional[str],
    assessment: Dict[str, Any],
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    existing_result = (
        get_supabase()
        .table("care_cases")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("conversation_id", conversation_id)
        .in_("status", ["open", "needs_human", "in_review"])
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    existing = (existing_result.data or [None])[0]
    urgency = assessment.get("urgency") or "needs_information"
    requires_human = bool(assessment.get("requires_human"))
    payload = {
        "clinic_id": clinic_id,
        "conversation_id": conversation_id,
        "contact_id": contact_id,
        "latest_message_id": inbound_message_id,
        "audience": assessment.get("audience") or "unknown",
        "intent": assessment.get("intent") or "unknown",
        "urgency": urgency,
        "status": "needs_human" if requires_human else "open",
        "summary": assessment.get("summary"),
        "suggested_action": assessment.get("suggested_action"),
        "requires_human": requires_human,
        "red_flags": assessment.get("red_flags") or [],
        "missing_information": assessment.get("missing_information") or [],
        "assistant_provider": assessment.get("provider"),
        "last_owner_message_at": now,
        "updated_at": now,
    }
    table = get_supabase().table("care_cases")
    if existing:
        result = table.update(payload).eq("id", existing["id"]).execute()
    else:
        result = table.insert(payload).execute()
    rows = result.data or []
    care_case = rows[0] if rows else {**(existing or {}), **payload}
    get_supabase().table("care_case_events").insert(
        {
            "clinic_id": clinic_id,
            "care_case_id": care_case.get("id"),
            "event_type": "assistant_assessment",
            "source_message_id": inbound_message_id,
            "payload": assessment,
        }
    ).execute()
    return care_case


def list_care_cases(clinic_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    result = (
        get_supabase()
        .table("care_cases")
        .select("*,whatsapp_contacts(*),whatsapp_conversations(*)")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def update_care_case(
    clinic_id: str,
    care_case_id: str,
    *,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    payload: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if status is not None:
        payload["status"] = status
    if assigned_to is not None:
        payload["assigned_to"] = assigned_to
    result = (
        get_supabase()
        .table("care_cases")
        .update(payload)
        .eq("clinic_id", clinic_id)
        .eq("id", care_case_id)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


def pet_belongs_to_clinic(clinic_id: str, pet_id: str) -> bool:
    result = (
        get_supabase()
        .table("pets")
        .select("id")
        .eq("clinic_id", clinic_id)
        .eq("id", pet_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)
