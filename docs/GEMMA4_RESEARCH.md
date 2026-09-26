# Gemma 4 12B for Kizuna

## Decision

Use Gemma 4 12B as Kizuna's clinical documentation and multimodal reasoning
model. Keep Parakeet as the speech-recognition layer.

```text
Consultation audio
  -> Parakeet transcription, timestamps, confidence
  -> transcript review and evidence spans
  -> Gemma 4 structured clinical extraction
  -> editable SOAP draft
  -> veterinarian approval
  -> patient record and optional owner communication
```

This separation is important. Parakeet provides fast, auditable word timing.
Gemma provides clinical organization and reasoning. Gemma 4 accepts audio, but
the official Hugging Face configuration limits audio to 30 seconds, which is
not enough for normal veterinary consultations.

## Verified model characteristics

- Official Google DeepMind release under Apache-2.0.
- 11.95 billion dense parameters.
- Text, image, and audio input; text output.
- 256K-token context window.
- Native system prompts, function calling, structured reasoning, and more than
  140 pretraining languages.
- Official full-precision Hugging Face checkpoint is approximately 46.8 GB.
- Google's QAT Q4 GGUF is approximately 7.57 GB and is the practical local
  starting point.

## Kizuna capabilities

Initial:

- Evidence-linked SOAP drafts.
- Negation and uncertainty preservation.
- Missing-information and contradiction detection.
- Patient-history summarization.
- Discharge instruction drafts after clinician approval.

Later:

- Read laboratory reports, vaccination cards, prescriptions, and handwritten
  clinic documents from images.
- Compare the current encounter with longitudinal patient history.
- Produce structured follow-up tasks and owner-safe summaries.
- Support multilingual intake while retaining the original transcript.

## Runtime plan

Local development uses `llama-server` with Google's QAT GGUF and multimodal
projection file. The backend talks to its OpenAI-compatible endpoint with
schema-constrained JSON. The server remains warm, so the model is not reloaded
for every consultation. Allow a five-minute request timeout for the first load
on machines without enough GPU memory.

The required files are:

- `gemma-4-12b-it-qat-q4_0.gguf` (approximately 6.98 GB)
- `mmproj-gemma-4-12b-it-qat-q4_0.gguf` (approximately 175 MB)

Download both files directly from the official Hugging Face repository with
`scripts/download-gemma4.ps1`. The script resumes interrupted transfers and
verifies the exact expected file sizes.

Start the local service with `scripts/start-gemma4.ps1`. The development
launcher uses an 8K context to stay within the current 16 GB workstation's
memory budget. Kizuna uses:

For unattended setup, `scripts/start-gemma4-when-ready.ps1` waits for the
download to finish and then starts the inference server.

```dotenv
SCRIBE_LLM_BASE_URL=http://127.0.0.1:8081/v1
SCRIBE_LLM_MODEL=gemma-4-12b-it-qat-q4_0
SCRIBE_LLM_TIMEOUT_SECONDS=300
```

The 12B Q4 model should be expected to need roughly 8 GB just for weights, plus
KV cache and runtime overhead. A practical target is:

- 12 GB or more VRAM for comfortable GPU inference at modest context sizes.
- 16 GB system RAM as a bare minimum for CPU or partial offload.
- 24 to 32 GB system RAM preferred for development.

Do not configure the full 256K context by default. Consultation notes normally
need 8K to 32K. Large context dramatically increases memory consumption.

Production should expose an OpenAI-compatible inference service behind the
existing provider-neutral adapter. Start with one warm model replica and a
small request queue. Add vLLM or another continuous-batching server only when
usage demonstrates the need.

## Clinical evaluation gate

Gemma 4 has general reasoning and medical multimodal benchmark results, but it
is not validated as a veterinary medical device. Before pilot use, create a
consented and de-identified evaluation set and measure:

- Presenting complaint recall.
- Negation error rate.
- Medication, route, frequency, and dosage accuracy.
- Hallucinated finding rate.
- Species, breed, sex, and patient attribution errors.
- SOAP section completeness.
- Veterinarian edit distance and review time.
- Performance across Nigerian and African English accents and clinic noise.

Every generated note remains a draft until a veterinarian approves it.

## Fine-tuning

Do not fine-tune first. Establish the baseline with prompts, schemas, and a
versioned evaluation set. When enough corrected notes exist, train a small
QLoRA adapter using de-identified transcript-to-approved-note pairs. Keep the
raw encounter, model draft, clinician edits, model version, and prompt version
as separate auditable records.
