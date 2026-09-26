"""Local speech-to-text through the parakeet.cpp command-line runtime."""

import asyncio
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict


class TranscriptionConfigurationError(RuntimeError):
    pass


class TranscriptionError(RuntimeError):
    pass


def _runtime_config() -> tuple[Path, Path, str, int]:
    executable = Path(os.getenv("PARAKEET_CLI_PATH", "")).expanduser()
    model = Path(os.getenv("PARAKEET_MODEL_PATH", "")).expanduser()
    language = os.getenv("PARAKEET_LANGUAGE", "en-US").strip() or "en-US"
    timeout_seconds = int(os.getenv("PARAKEET_TIMEOUT_SECONDS", "180"))

    if not executable.is_file():
        raise TranscriptionConfigurationError(
            "PARAKEET_CLI_PATH does not point to a parakeet-cli executable."
        )
    if not model.is_file():
        raise TranscriptionConfigurationError(
            "PARAKEET_MODEL_PATH does not point to a GGUF model."
        )
    return executable, model, language, timeout_seconds


def _parse_json_output(stdout: str) -> Dict[str, Any]:
    decoder = json.JSONDecoder()
    for offset, character in enumerate(stdout):
        if character != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(stdout[offset:])
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and isinstance(payload.get("text"), str):
            return payload
    raise TranscriptionError("Parakeet returned no valid transcription JSON.")


def _run_parakeet(wav_path: Path) -> Dict[str, Any]:
    executable, model, language, timeout_seconds = _runtime_config()
    command = [
        str(executable),
        "transcribe",
        "--model",
        str(model),
        "--input",
        str(wav_path),
        "--json",
    ]
    if "nemotron" in model.name.lower():
        command.extend(["--lang", language])

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
            timeout=timeout_seconds,
            encoding="utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired as exc:
        raise TranscriptionError("Parakeet transcription timed out.") from exc
    except OSError as exc:
        raise TranscriptionError("Parakeet could not be started.") from exc

    if result.returncode != 0:
        detail = result.stderr.strip()[-800:] or "Unknown parakeet.cpp error."
        raise TranscriptionError(f"Parakeet transcription failed: {detail}")

    payload = _parse_json_output(result.stdout)
    transcript = payload["text"].strip()
    if not transcript:
        raise TranscriptionError("No speech was detected in the recording.")
    return {
        "transcript": transcript,
        "words": payload.get("words", []),
        "tokens": payload.get("tokens", []),
        "provider": f"parakeet.cpp:{model.stem}",
        "language": language if "nemotron" in model.name.lower() else "en",
    }


async def transcribe_wav(contents: bytes) -> Dict[str, Any]:
    if len(contents) < 44 or contents[:4] != b"RIFF" or contents[8:12] != b"WAVE":
        raise TranscriptionError("Audio must be a valid WAV file.")

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(contents)
            temp_path = Path(temp_file.name)
        return await asyncio.to_thread(_run_parakeet, temp_path)
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)
