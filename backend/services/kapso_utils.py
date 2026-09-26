"""Dependency-free helpers for Kapso WhatsApp integration."""

import hashlib
import hmac
import json
import re
from typing import Any, Dict, Optional

PHONE_PATTERN = re.compile(r"^[1-9]\d{7,14}$")


def normalize_phone_number(value: str) -> str:
    """Return a WhatsApp-compatible E.164 number without the plus prefix."""
    cleaned = re.sub(r"[^\d]", "", value.replace("whatsapp:", ""))
    if not PHONE_PATTERN.fullmatch(cleaned):
        raise ValueError(
            "Phone number must include a country code and contain 8 to 15 digits."
        )
    return cleaned


def verify_kapso_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str],
) -> bool:
    """Verify the HMAC SHA256 signature Kapso sends with webhook events."""
    webhook_secret = (secret or "").strip()
    if not webhook_secret or not signature:
        return False
    provided = signature.removeprefix("sha256=").strip().lower()
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        raw_payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(provided, expected)


def canonical_json(payload: Dict[str, Any]) -> bytes:
    """Serialize payloads consistently for tests and local webhook tooling."""
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
