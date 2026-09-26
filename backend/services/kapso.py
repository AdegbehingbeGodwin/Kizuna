"""Kapso WhatsApp client, webhook verification, and event normalization."""

import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from services.kapso_utils import (
    canonical_json,
    normalize_phone_number,
    verify_kapso_signature as verify_signature,
)

from services.supabase_db import (
    create_outbound_whatsapp_message,
    get_whatsapp_account,
    mark_whatsapp_webhook_processed,
    record_whatsapp_webhook_event,
    update_whatsapp_message_status,
    upsert_inbound_whatsapp_message,
    upsert_whatsapp_account,
    upsert_whatsapp_contact,
    upsert_whatsapp_conversation,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

KAPSO_BASE_URL = "https://api.kapso.ai/meta/whatsapp"
class KapsoConfigurationError(RuntimeError):
    """Raised when required Kapso configuration is missing."""


class KapsoAPIError(RuntimeError):
    """Raised when Kapso rejects or cannot complete a request."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        response_body: Optional[Any] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


def verify_kapso_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    webhook_secret = secret or os.getenv("KAPSO_WEBHOOK_SECRET", "")
    return verify_signature(raw_payload, signature, webhook_secret)


def _config(
    phone_number_id: Optional[str] = None,
) -> tuple[str, str, str]:
    api_key = os.getenv("KAPSO_API_KEY", "").strip()
    version = os.getenv("KAPSO_VERSION", "v24.0").strip()
    selected_phone_id = (
        phone_number_id or os.getenv("KAPSO_PHONE_NUMBER_ID", "")
    ).strip()

    if not api_key or api_key.startswith("your_"):
        raise KapsoConfigurationError("KAPSO_API_KEY is not configured.")
    if not selected_phone_id or selected_phone_id.startswith("your_"):
        raise KapsoConfigurationError("A Kapso phone number ID is required.")
    return api_key, version, selected_phone_id


async def _send_message(
    *,
    to: str,
    message_type: str,
    type_payload: Dict[str, Any],
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
    draft_id: Optional[str] = None,
    content: Optional[str] = None,
    template_name: Optional[str] = None,
) -> Dict[str, Any]:
    api_key, version, selected_phone_id = _config(phone_number_id)
    clean_to = normalize_phone_number(to)
    url = f"{KAPSO_BASE_URL}/{version}/{selected_phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": message_type,
        message_type: type_payload,
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0)) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "X-API-Key": api_key,
                    "Content-Type": "application/json",
                },
            )
    except httpx.HTTPError as exc:
        raise KapsoAPIError(f"Kapso connection failed: {exc}") from exc

    try:
        response_data = response.json()
    except ValueError:
        response_data = {"raw": response.text}

    if not response.is_success:
        error_message = _extract_error_message(response_data)
        try:
            create_outbound_whatsapp_message(
                phone_number_id=selected_phone_id,
                to_number=clean_to,
                message_type=message_type,
                content=content,
                whatsapp_message_id=None,
                raw_payload=response_data,
                status="failed",
                clinic_id=clinic_id,
                pet_id=pet_id,
                draft_id=draft_id,
                template_name=template_name,
            )
        except Exception:
            pass
        raise KapsoAPIError(
            error_message,
            status_code=response.status_code,
            response_body=response_data,
        )

    message_id = ((response_data.get("messages") or [{}])[0]).get("id")
    try:
        upsert_whatsapp_account(
            selected_phone_id,
            clinic_id=clinic_id,
            is_default=phone_number_id is None,
        )
        create_outbound_whatsapp_message(
            phone_number_id=selected_phone_id,
            to_number=clean_to,
            message_type=message_type,
            content=content,
            whatsapp_message_id=message_id,
            raw_payload=response_data,
            clinic_id=clinic_id,
            pet_id=pet_id,
            draft_id=draft_id,
            template_name=template_name,
        )
    except Exception as exc:
        # Sending succeeded. Persistence failure must be observable without
        # falsely reporting that WhatsApp rejected the message.
        response_data["persistence_warning"] = str(exc)

    return {
        "success": True,
        "message_id": message_id,
        "phone_number_id": selected_phone_id,
        "to": clean_to,
        "response": response_data,
    }


async def send_whatsapp_text(
    to: str,
    message: str,
    *,
    preview_url: bool = False,
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
    draft_id: Optional[str] = None,
) -> Dict[str, Any]:
    if not message.strip():
        raise ValueError("Message cannot be empty.")
    return await _send_message(
        to=to,
        message_type="text",
        type_payload={"body": message.strip(), "preview_url": preview_url},
        phone_number_id=phone_number_id,
        clinic_id=clinic_id,
        pet_id=pet_id,
        draft_id=draft_id,
        content=message.strip(),
    )


async def send_whatsapp_template(
    to: str,
    *,
    template_name: str,
    language_code: str,
    components: Optional[List[Dict[str, Any]]] = None,
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
    draft_id: Optional[str] = None,
) -> Dict[str, Any]:
    template: Dict[str, Any] = {
        "name": template_name,
        "language": {"code": language_code},
    }
    if components:
        template["components"] = components
    return await _send_message(
        to=to,
        message_type="template",
        type_payload=template,
        phone_number_id=phone_number_id,
        clinic_id=clinic_id,
        pet_id=pet_id,
        draft_id=draft_id,
        template_name=template_name,
    )


async def send_whatsapp_interactive(
    to: str,
    *,
    interactive: Dict[str, Any],
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
) -> Dict[str, Any]:
    if interactive.get("type") not in {"button", "list", "cta_url", "flow"}:
        raise ValueError("Unsupported interactive message type.")
    return await _send_message(
        to=to,
        message_type="interactive",
        type_payload=interactive,
        phone_number_id=phone_number_id,
        clinic_id=clinic_id,
        pet_id=pet_id,
        content=((interactive.get("body") or {}).get("text")),
    )


async def send_whatsapp_reminder(
    to: str,
    message: str,
    *,
    phone_number_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    pet_id: Optional[str] = None,
    draft_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Backward-compatible text sender used by the existing dashboard."""
    return await send_whatsapp_text(
        to,
        message,
        phone_number_id=phone_number_id,
        clinic_id=clinic_id,
        pet_id=pet_id,
        draft_id=draft_id,
    )


def process_kapso_webhook(
    *,
    event_type: str,
    idempotency_key: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Persist and normalize one Kapso v2 webhook event."""
    assistant_events: List[Dict[str, Any]] = []
    phone_number_id = _first_value(
        payload.get("phone_number_id"),
        _nested(payload, "data", "phone_number_id"),
    )
    is_new = record_whatsapp_webhook_event(
        idempotency_key=idempotency_key,
        event_type=event_type,
        phone_number_id=phone_number_id,
        payload=payload,
    )
    if not is_new:
        return {
            "duplicate": True,
            "event_type": event_type,
            "assistant_events": assistant_events,
        }

    try:
        batch = payload.get("data")
        if isinstance(batch, list):
            for item in batch:
                item_payload = {
                    "phone_number_id": phone_number_id,
                    "data": item,
                }
                assistant_event = _dispatch_event(
                    event_type,
                    item_payload,
                    phone_number_id,
                )
                if assistant_event:
                    assistant_events.append(assistant_event)
        else:
            assistant_event = _dispatch_event(event_type, payload, phone_number_id)
            if assistant_event:
                assistant_events.append(assistant_event)
        mark_whatsapp_webhook_processed(idempotency_key)
        return {
            "duplicate": False,
            "event_type": event_type,
            "assistant_events": assistant_events,
        }
    except Exception as exc:
        mark_whatsapp_webhook_processed(idempotency_key, error=str(exc))
        raise


def _dispatch_event(
    event_type: str,
    payload: Dict[str, Any],
    phone_number_id: Optional[str],
) -> Optional[Dict[str, Any]]:
    if event_type == "whatsapp.phone_number.created":
        _process_phone_number_created(payload)
    elif event_type == "whatsapp.message.received":
        return _process_inbound_message(payload, phone_number_id)
    elif event_type in {
        "whatsapp.message.sent",
        "whatsapp.message.delivered",
        "whatsapp.message.read",
        "whatsapp.message.failed",
    }:
        _process_message_status(event_type, payload)
    elif event_type.startswith("whatsapp.conversation."):
        _process_conversation_event(event_type, payload, phone_number_id)
    return None


def _process_phone_number_created(payload: Dict[str, Any]) -> None:
    phone_number_id = _first_value(
        payload.get("phone_number_id"),
        _nested(payload, "data", "phone_number_id"),
    )
    if not phone_number_id:
        return
    customer = payload.get("customer") or _nested(payload, "data", "customer") or {}
    upsert_whatsapp_account(
        phone_number_id,
        clinic_id=customer.get("id"),
        metadata=payload,
    )


def _process_inbound_message(
    payload: Dict[str, Any],
    phone_number_id: Optional[str],
) -> Optional[Dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    message = data.get("message") or {}
    conversation_data = data.get("conversation") or {}
    account = (
        get_whatsapp_account(phone_number_id=phone_number_id)
        if phone_number_id
        else None
    )
    clinic_id = (account or {}).get("clinic_id")

    phone_number = _first_value(
        conversation_data.get("phone_number"),
        message.get("from"),
        _nested(message, "kapso", "phone_number"),
    )
    bsuid = conversation_data.get("business_scoped_user_id")
    contact = upsert_whatsapp_contact(
        clinic_id=clinic_id,
        phone_number=phone_number,
        business_scoped_user_id=bsuid,
        parent_business_scoped_user_id=conversation_data.get(
            "parent_business_scoped_user_id"
        ),
        username=conversation_data.get("username"),
        display_name=_first_value(
            conversation_data.get("name"),
            _nested(data, "contact", "name"),
        ),
    )
    conversation = upsert_whatsapp_conversation(
        external_conversation_id=conversation_data.get("id"),
        account_id=(account or {}).get("id"),
        contact_id=(contact or {}).get("id"),
        clinic_id=clinic_id,
        status="open",
        metadata=conversation_data,
    )
    message_type = message.get("type") or "unknown"
    content = _message_content(message)
    saved_message = upsert_inbound_whatsapp_message(
        whatsapp_message_id=message.get("id"),
        phone_number_id=phone_number_id,
        from_number=phone_number,
        message_type=message_type,
        content=content,
        status=_nested(message, "kapso", "status") or "received",
        raw_payload=payload,
        contact=contact,
        conversation=conversation,
        clinic_id=clinic_id,
    )
    if not clinic_id or not conversation or not content:
        return None
    return {
        "clinic_id": clinic_id,
        "phone_number_id": phone_number_id,
        "contact_id": (contact or {}).get("id"),
        "conversation_id": conversation.get("id"),
        "message_id": saved_message.get("id"),
        "message_type": message_type,
        "content": content,
        "from_number": phone_number,
    }


def _process_message_status(event_type: str, payload: Dict[str, Any]) -> None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    message = data.get("message") or {}
    status = event_type.rsplit(".", 1)[-1]
    errors = message.get("errors") or _nested(message, "kapso", "errors") or []
    first_error = errors[0] if errors else {}
    message_id = message.get("id")
    if not message_id:
        return
    update_whatsapp_message_status(
        whatsapp_message_id=message_id,
        status=status,
        raw_payload=payload,
        error_code=str(first_error.get("code")) if first_error.get("code") else None,
        error_message=_first_value(
            first_error.get("message"),
            first_error.get("title"),
        ),
    )


def _process_conversation_event(
    event_type: str,
    payload: Dict[str, Any],
    phone_number_id: Optional[str],
) -> None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    conversation_data = data.get("conversation") or {}
    account = (
        get_whatsapp_account(phone_number_id=phone_number_id)
        if phone_number_id
        else None
    )
    status = {
        "whatsapp.conversation.created": "open",
        "whatsapp.conversation.ended": "closed",
        "whatsapp.conversation.inactive": "inactive",
    }.get(event_type, "open")
    upsert_whatsapp_conversation(
        external_conversation_id=conversation_data.get("id"),
        account_id=(account or {}).get("id"),
        contact_id=None,
        clinic_id=(account or {}).get("clinic_id"),
        status=status,
        metadata=conversation_data,
    )


def _message_content(message: Dict[str, Any]) -> Optional[str]:
    kapso = message.get("kapso") or {}
    return _first_value(
        _nested(message, "text", "body"),
        kapso.get("content"),
        kapso.get("transcript"),
        _nested(message, "interactive", "button_reply", "title"),
        _nested(message, "interactive", "list_reply", "title"),
        _nested(message, "button", "text"),
        _nested(message, "document", "caption"),
        _nested(message, "image", "caption"),
    )


def _extract_error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            return str(
                _first_value(
                    error.get("message"),
                    _nested(error, "error_data", "details"),
                    "Kapso rejected the WhatsApp message.",
                )
            )
        if error:
            return str(error)
        if payload.get("message"):
            return str(payload["message"])
    return "Kapso rejected the WhatsApp message."


def _nested(data: Any, *keys: str) -> Any:
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _first_value(*values: Any) -> Any:
    return next((value for value in values if value not in (None, "")), None)
