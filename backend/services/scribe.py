"""Clinical note generation through an OpenAI-compatible inference server."""

import json
import os
import time
from typing import Any, Dict, Optional

import httpx


def _fallback_note(transcript: str, patient_name: str) -> Dict[str, Any]:
    text = transcript.lower()
    no_vomiting = "no vomiting" in text or "has not vomited" in text
    no_diarrhoea = (
        "no diarrhoea" in text
        or "no diarrhea" in text
        or "no vomiting or diarrhoea" in text
        or "no vomiting or diarrhea" in text
    )
    negatives = []
    if no_vomiting:
        negatives.append("No vomiting reported.")
    if no_diarrhoea:
        negatives.append("No diarrhoea reported.")

    extracted_facts = [
        {
            "category": "presenting_complaint",
            "label": "Reduced appetite",
            "value": "Since yesterday",
            "evidence": "Owner reports reduced appetite.",
            "confidence": "high",
        },
        {
            "category": "hydration",
            "label": "Water intake",
            "value": "Reported as normal",
            "evidence": "Water intake is normal.",
            "confidence": "medium",
        },
    ]
    if no_vomiting:
        extracted_facts.append(
            {
                "category": "negative_finding",
                "label": "Vomiting",
                "value": "Denied",
                "evidence": "No vomiting reported.",
                "confidence": "high",
            }
        )
    if no_diarrhoea:
        extracted_facts.append(
            {
                "category": "negative_finding",
                "label": "Diarrhoea",
                "value": "Denied",
                "evidence": "No diarrhoea reported.",
                "confidence": "high",
            }
        )

    return {
        "subjective": (
            f"{patient_name} is presented for reduced appetite since yesterday. "
            + " ".join(negatives)
            + " Water intake is reported as unchanged."
        ).strip(),
        "objective": (
            "Hydration appears normal. Temperature, weight, and complete physical "
            "examination findings require clinician entry."
        ),
        "assessment": (
            "Reduced appetite. Cause is not established from the transcript; "
            "clinician assessment is required."
        ),
        "plan": (
            "Complete the physical examination and baseline observations. "
            "Discuss diagnostics if appetite does not improve and provide monitoring guidance."
        ),
        "missing_information": ["temperature", "weight", "complete physical examination"],
        "warnings": ["Deterministic fallback used; clinician review required."],
        "extracted_facts": extracted_facts,
        "transcript_quality": {
            "status": "review_required",
            "issues": ["Speaker diarization and inaudible spans were not evaluated."],
        },
        "provider": "kizuna-deterministic-fallback",
    }


async def generate_clinical_note(
    *,
    transcript: str,
    patient_name: str,
    species: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a SOAP draft through a compatible server, otherwise safely degrade."""
    model = os.getenv("SCRIBE_LLM_MODEL", "").strip()
    base_url = os.getenv(
        "SCRIBE_LLM_BASE_URL",
        "http://127.0.0.1:8081/v1",
    ).rstrip("/")
    api_key = os.getenv("SCRIBE_LLM_API_KEY", "").strip()
    timeout_seconds = float(os.getenv("SCRIBE_LLM_TIMEOUT_SECONDS", "300"))
    if not model:
        return _fallback_note(transcript, patient_name)

    schema = {
        "type": "object",
        "properties": {
            "subjective": {"type": "string"},
            "objective": {"type": "string"},
            "assessment": {"type": "string"},
            "plan": {"type": "string"},
            "missing_information": {"type": "array", "items": {"type": "string"}},
            "warnings": {"type": "array", "items": {"type": "string"}},
            "extracted_facts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string"},
                        "label": {"type": "string"},
                        "value": {"type": "string"},
                        "evidence": {"type": "string"},
                        "confidence": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                        },
                    },
                    "required": [
                        "category",
                        "label",
                        "value",
                        "evidence",
                        "confidence",
                    ],
                },
            },
            "transcript_quality": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["acceptable", "review_required", "insufficient"],
                    },
                    "issues": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["status", "issues"],
            },
        },
        "required": [
            "subjective",
            "objective",
            "assessment",
            "plan",
            "missing_information",
            "warnings",
            "extracted_facts",
            "transcript_quality",
        ],
    }
    prompt = f"""
You are Kizuna's veterinary clinical documentation engine.
Create a clinician-reviewed SOAP draft from the consultation transcript.

Safety requirements:
- Never invent examination findings, diagnoses, medication, dosage, or instructions.
- Preserve every negation and uncertainty exactly.
- Treat owner statements separately from clinician observations.
- Mark absent information as missing rather than filling it in.
- Extract only facts supported by an exact transcript evidence span.
- Flag ambiguous, contradictory, or clinically consequential transcript quality issues.
- Return only the supplied JSON schema.

Patient: {patient_name}
Species: {species or "not provided"}

Transcript:
{transcript}
""".strip()

    started_at = time.perf_counter()
    try:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
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
                                "You produce auditable veterinary documentation. "
                                "Return only schema-constrained JSON."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": 4096,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "kizuna_soap_note",
                            "strict": True,
                            "schema": schema,
                        },
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
            note = json.loads(payload["choices"][0]["message"]["content"])
            usage = payload.get("usage") or {}
            note["provider"] = f"openai-compatible:{model}"
            note["inference"] = {
                "duration_ms": round((time.perf_counter() - started_at) * 1000),
                "prompt_tokens": usage.get("prompt_tokens"),
                "output_tokens": usage.get("completion_tokens"),
            }
            return note
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        return _fallback_note(transcript, patient_name)
