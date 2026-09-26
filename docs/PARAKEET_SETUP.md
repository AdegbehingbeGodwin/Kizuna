# Parakeet ASR

Kizuna sends 16 kHz mono WAV audio to a tenant-protected backend endpoint. The
backend invokes `parakeet.cpp`, reads its timestamped JSON, and passes the
transcript into the existing SOAP-note generator.

## Recommended models

- Local development and English-first demo: `tdt_ctc-110m-q5_k.gguf`
- Multilingual evaluation: `nemotron-3.5-asr-streaming-0.6b-q5_k.gguf`

The 110M model is the practical default for a solo founder: small, fast, and
cheap to host. Nemotron should be promoted only after testing Nigerian and
African English, accents, clinic noise, veterinary terminology, and language
switching against a consented evaluation set.

## Configuration

Set these variables in `backend/.env`:

```dotenv
PARAKEET_CLI_PATH=C:\runtime\parakeet-cli.exe
PARAKEET_MODEL_PATH=C:\models\tdt_ctc-110m-q5_k.gguf
PARAKEET_LANGUAGE=en-US
PARAKEET_TIMEOUT_SECONDS=180
SCRIBE_AUDIO_MAX_BYTES=104857600
```

The model and executable are deployment artifacts. Do not commit them to Git.

## Production direction

The CLI adapter is appropriate for the demo and low concurrency. Production
should run a persistent ASR worker that loads the model once, accepts jobs from
the API, enforces per-clinic quotas, and returns transcript segments with
timestamps and confidence. This avoids loading the GGUF file for every visit.
