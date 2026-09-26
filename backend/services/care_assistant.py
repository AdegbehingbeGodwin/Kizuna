"""Safety-first owner intake and triage through the shared Gemma runtime."""

import json
import os
from typing import Any, Dict, List, Optional

import httpx


EMERGENCY_TERMS = {
    "cannot breathe",
    "can't breathe",
    "difficulty breathing",
    "collapsed",
    "unconscious",
    "seizure",
    "seizing",
    "heavy bleeding",
    "bleeding heavily",
    "poison",
    "poisoned",
    "snake bite",
    "snakebite",
    "unable to stand",
}

FARM_TERMS = {
    "herd",
    "flock",
    "farm",
    "cattle",
    "cow",
    "goat",
    "sheep",
    "pig",
    "poultry",
    "chicken",
    "broiler",
    "layer",
}


def _contains_emergency(text: str) -> bool:
    normalized = text.lower()
    return any(term in normalized for term in EMERGENCY_TERMS)


def _fallback_assessment(message: str) -> Dict[str, Any]:
    normalized = message.lower()
    audience = "farm_owner" if any(term in normalized for term in FARM_TERMS) else "pet_owner"
    emergency = _contains_emergency(message)
    if emergency:
        return {
            "audience": audience,
            "intent": "animal_unwell",
            "urgency": "emergency",
            "summary": "The owner described a possible emergency warning sign.",
            "reply": (
                "This may be an emergency. Please contact the clinic or the nearest "
                "available veterinary service now. Keep the animal as calm and safe "
                "as possible, and do not give medication unless a veterinarian has "
                "already instructed you to do so."
            ),
            "missing_information": [],
            "red_flags": ["Possible emergency symptom reported"],
            "requires_human": True,
            "suggested_action": "immediate_clinic_contact",
            "provider": "kizuna-safety-fallback",
        }

    subject = "animal or herd" if audience == "farm_owner" else "pet"
    return {
        "audience": audience,
        "intent": "animal_unwell",
        "urgency": "needs_information",
        "summary": "More structured information is required before the clinic can triage this request.",
        "reply": (
            f"I can help the clinic understand what is happening with your {subject}. "
            "Please send the species, age, main symptom, when it started, whether the "
            "animal is eating and drinking, and how many animals are affected. "
            "If there is collapse, trouble breathing, seizure, poisoning, or heavy "
            "bleeding, contact a veterinary professional immediately."
        ),
        "missing_information": [
            "species",
            "age or production group",
            "main symptom and duration",
            "eating and drinking status",
        ],
        "red_flags": [],
        "requires_human": False,
        "suggested_action": "collect_more_information",
        "provider": "kizuna-safety-fallback",
    }


def fallback_owner_assessment(message: str) -> Dict[str, Any]:
    """Public safety fallback for channel adapters with strict response deadlines."""
    return _fallback_assessment(message)


async def assess_owner_message(
    *,
    message: str,
    recent_messages: Optional[List[Dict[str, Any]]] = None,
    clinic_name: str = "the clinic",
) -> Dict[str, Any]:
    """Return structured intake and an owner-safe reply."""
    if _contains_emergency(message):
        return _fallback_assessment(message)

    model = (
        os.getenv("CARE_ASSISTANT_LLM_MODEL", "").strip()
        or os.getenv("SCRIBE_LLM_MODEL", "").strip()
    )
    if not model:
        return _fallback_assessment(message)

    base_url = (
        os.getenv("CARE_ASSISTANT_LLM_BASE_URL", "").strip()
        or os.getenv("SCRIBE_LLM_BASE_URL", "http://127.0.0.1:8081/v1").strip()
    ).rstrip("/")
    api_key = (
        os.getenv("CARE_ASSISTANT_LLM_API_KEY", "").strip()
        or os.getenv("SCRIBE_LLM_API_KEY", "").strip()
    )
    timeout_seconds = float(
        os.getenv(
            "CARE_ASSISTANT_LLM_TIMEOUT_SECONDS",
            os.getenv("SCRIBE_LLM_TIMEOUT_SECONDS", "300"),
        )
    )
    history = recent_messages or []
    schema = {
        "type": "object",
        "properties": {
            "audience": {"type": "string", "enum": ["pet_owner", "farm_owner", "unknown"]},
            "intent": {
                "type": "string",
                "enum": [
                    "animal_unwell",
                    "appointment",
                    "preventive_care",
                    "post_treatment_followup",
                    "administrative",
                    "unknown",
                ],
            },
            "urgency": {
                "type": "string",
                "enum": ["emergency", "urgent", "routine", "needs_information"],
            },
            "summary": {"type": "string"},
            "reply": {"type": "string"},
            "missing_information": {"type": "array", "items": {"type": "string"}},
            "red_flags": {"type": "array", "items": {"type": "string"}},
            "requires_human": {"type": "boolean"},
            "suggested_action": {
                "type": "string",
                "enum": [
                    "immediate_clinic_contact",
                    "human_review",
                    "book_appointment",
                    "collect_more_information",
                    "routine_guidance",
                ],
            },
        },
        "required": [
            "audience",
            "intent",
            "urgency",
            "summary",
            "reply",
            "missing_information",
            "red_flags",
            "requires_human",
            "suggested_action",
        ],
    }
    prompt = f"""
You are Kizuna Care, a veterinary clinic intake assistant in a messaging conversation.
Classify and summarize the owner's message for {clinic_name}, then write a concise reply.

Safety rules:
- You are not a veterinarian and must not diagnose, prescribe, calculate doses, or claim certainty.
- Emergency signs include breathing difficulty, collapse, seizure, poisoning, heavy bleeding,
  inability to stand, severe trauma, prolonged obstructed labour, or many animals suddenly affected.
- Emergency replies must direct the owner to immediate professional veterinary care.
- Urgent, ambiguous, medicine, dosage, outbreak, and post-operative concerns require human review.
- Ask no more than four high-value questions at once.
- For farms, ask how many animals are affected or dead and whether new animals recently arrived.
- Never promise that a clinician is currently online.
- Keep the reply suitable for a mobile chat and under 120 words.

Recent conversation:
{json.dumps(history[-8:], ensure_ascii=True)}

Latest owner message:
{message}
""".strip()

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_seconds)) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "Return safe veterinary intake JSON only. "
                                "Never provide diagnosis, prescriptions, or medication doses."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": 1200,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "kizuna_care_intake",
                            "strict": True,
                            "schema": schema,
                        },
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
            assessment = json.loads(payload["choices"][0]["message"]["content"])
            assessment["provider"] = f"openai-compatible:{model}"
            if assessment.get("urgency") == "emergency":
                safe_emergency = _fallback_assessment(message)
                assessment["reply"] = safe_emergency["reply"]
                assessment["requires_human"] = True
                assessment["suggested_action"] = "immediate_clinic_contact"
            return assessment
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        return _fallback_assessment(message)
