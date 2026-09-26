# Kizuna Open-Source and Research Plan

Status: Proposed  
Date: 2026-06-10  
Constraint: solo founder with minimal cash and no dedicated GPU fleet

## The Strategy

Kizuna should be **open-source-model first, benchmark driven, and API optional**.

That means:

- use local models during development and retrospective processing;
- keep every model behind an adapter;
- pay for burst inference only when it is cheaper than owning hardware;
- never make a paid provider the only way to recover a clinical record;
- collect consented corrections and evaluation data from day one;
- delay fine-tuning until the baseline failure modes are measured.

Open weights do not make compute free. The real objective is **near-zero fixed
cost**, not ideological self-hosting at any cost.

## Minimal Solo-Founder System

```text
Clinic phone/browser
  -> local chunked recording
  -> low-cost object storage
  -> PostgreSQL queue
  -> one worker process
  -> faster-whisper
  -> small quantized instruction model
  -> veterinarian review
```

Run the API and worker from the same repository. They may run on the same small
server initially, but remain separate processes so long AI work cannot block
HTTP requests.

Do not add:

- Kubernetes;
- Kafka;
- LiveKit;
- multiple databases;
- multiple always-on GPU servers;
- a vector database before record recap exists;
- model fine-tuning before an evaluation set exists.

## Recommended Model Ladder

The word "best" is not useful without hardware, language, latency, and accuracy
constraints. Kizuna should maintain a model ladder rather than one permanent
winner.

### Speech recognition

#### Baseline: Whisper through faster-whisper

- OpenAI Whisper code and weights use the MIT license.
- `faster-whisper` runs Whisper through CTranslate2 and supports CPU/GPU
  quantization.
- Start with `small` or `medium` in INT8 on CPU for development.
- Benchmark `large-v3` or the current high-quality Whisper checkpoint on rented
  GPU for the research baseline.
- Use `whisper.cpp` when simple CPU deployment or edge experiments are useful.

Why this is the starting point:

- mature ecosystem;
- timestamps;
- multilingual/code-switching baseline;
- runs without a permanent paid API;
- straightforward fine-tuning and quantization ecosystem.

It is not automatically the best model for African veterinary consultations.
That must be measured.

#### Research challengers

- NVIDIA NeMo Canary/FastConformer models.
- SeamlessM4T for multilingual speech or translation experiments.
- African-language speech checkpoints discovered through Masakhane, Lanfrica,
  DSFSI, and Hugging Face.

Licences must be reviewed checkpoint by checkpoint. Open weights are not always
licensed for unrestricted commercial use.

### Clinical note generation

Start with a quantized 4B-9B instruction model that can reliably produce
schema-constrained JSON.

Candidates to benchmark:

- Qwen3 4B/8B or a current equivalent with a permissive licence;
- a small Mistral checkpoint when the hardware can support it;
- Gemma only after accepting and reviewing its model terms.

Run locally with:

- `llama.cpp` for low-overhead GGUF inference and constrained JSON;
- Ollama for the easiest development experience;
- vLLM only when there is enough GPU traffic to justify a serving engine.

Do not use a 20B+ model merely because it scores better on broad benchmarks. A
small model with a strict schema, a narrow veterinary prompt, and transcript
evidence may be safer and dramatically cheaper.

### Fine-tuning rule

Do not fine-tune first.

Progress in this order:

1. deterministic preprocessing;
2. veterinary terminology dictionary;
3. strong prompt and JSON schema;
4. few-shot examples selected by visit type;
5. retrieval of clinic templates;
6. error analysis;
7. LoRA/QLoRA only after enough corrected examples exist.

Use Hugging Face PEFT for parameter-efficient experiments. Keep the untouched
base model, adapter, training manifest, code commit, random seed, and evaluation
results.

## A Zero-Fixed-Cost Development Path

### On your current computer

- Run Whisper `small`/`medium` with INT8 using faster-whisper.
- Run a 4B quantized language model with llama.cpp or Ollama.
- Process asynchronously; a draft taking several minutes is acceptable during
  research and early pilots if the audio is safe.
- Record all latency and memory measurements.

### When local hardware is insufficient

Use short-lived GPU jobs only for:

- evaluating larger ASR checkpoints;
- batch transcription;
- LoRA experiments;
- final benchmark runs.

Turn the machine off after the job. Do not operate an idle GPU endpoint.

Free Colab/Kaggle-style environments may be used for public, synthetic, or
properly de-identified research data. Do not upload identifiable clinic audio
or owner information to consumer notebook services without a reviewed data
processing agreement and explicit authorization.

### Partnerships instead of infrastructure spend

Approach:

- a Nigerian veterinary school;
- a computer science/NLP laboratory;
- Masakhane researchers;
- a teaching hospital;
- an African speech research group.

You need more than compute. A credible paper benefits from:

- a veterinary principal investigator or clinical advisor;
- an NLP/speech methods advisor;
- ethics review;
- independent annotators;
- institutional credibility and reproducibility support.

## Research Contribution Options

Do not state "this is the first" until a systematic review confirms it.

Potential contributions:

1. **Dataset paper**
   - a consented corpus of African veterinary consultations;
   - accent, language, species, visit type, device, and noise metadata;
   - professionally corrected transcripts;
   - strong documentation and access controls.

2. **Benchmark paper**
   - compare open ASR systems on African veterinary speech;
   - report overall and subgroup performance;
   - analyse drug, breed, dosage, negation, and named-entity errors.

3. **Clinical summarization paper**
   - evaluate transcript-to-SOAP generation;
   - compare prompt-only, retrieval, and LoRA approaches;
   - measure clinically significant omissions and hallucinations.

4. **Human-AI workflow paper**
   - measure note completion time, edit burden, trust, and adoption;
   - compare unaided notes with AI-assisted review;
   - avoid unsupported clinical outcome claims.

5. **Low-resource deployment paper**
   - study accuracy, latency, and recovery under weak connectivity and
     low-cost hardware.

The first paper should probably be a benchmark/data statement, not a claim that
Kizuna improves animal health.

## Separate Product Consent From Research Consent

This is non-negotiable.

A clinic using Kizuna to create a note has not automatically agreed that its
audio can be used for research, model training, or public datasets.

Maintain separate choices:

1. **Product processing consent**
   - record/transcribe this consultation for care documentation.

2. **Internal quality consent**
   - use a de-identified copy to evaluate and improve Kizuna.

3. **Model-training consent**
   - use the de-identified example to adapt models.

4. **Research/publication consent**
   - include derived results in research.

5. **Data-release consent**
   - release audio/transcripts under a defined access model.

Each purpose needs a recorded version of the consent text, actor, timestamp,
scope, and withdrawal status.

Owner consent and clinician/speaker consent may both be needed. Obtain Nigerian
legal and institutional ethics advice before data collection.

## Dataset Design

### Unit of data

Use an immutable `research_sample_id` that is different from product patient,
owner, user, and clinic identifiers.

Store research metadata in a separate schema/project from production.

Suggested manifest:

```json
{
  "research_sample_id": "opaque-id",
  "audio_object": "restricted/object/path",
  "duration_seconds": 612,
  "country": "NG",
  "region": "south-west",
  "language_mix": ["en-NG", "yo"],
  "speaker_roles": ["veterinarian", "owner"],
  "species": "canine",
  "visit_type": "outpatient",
  "device_class": "android-phone",
  "noise_tags": ["fan", "animal-vocalization"],
  "consent_scope": ["evaluation"],
  "split_group": "clinic-opaque-id",
  "transcript_version": "gold-v1"
}
```

Do not store names, phone numbers, addresses, precise clinic location, or
unnecessary dates in a research manifest.

### Sampling

Actively track representation:

- country and broad region;
- language and code-switching;
- speaker gender where ethically collected and self-described;
- clinician experience;
- clinic type;
- species and visit type;
- phone/device type;
- noise conditions;
- urban/rural context where safe and useful.

Avoid building "African speech" from one city, one clinic, or one elite English
variety and then claiming continental generalization.

### Data splits

Split by **speaker and clinic**, not random audio segment.

Otherwise the same voices and acoustic environment leak into training and test
sets and make results look better than they are.

Keep:

- training set;
- development set;
- locked test set;
- challenge set for rare drugs, breeds, code-switching, and noise.

Do not tune prompts or models against the locked test set.

## Annotation Protocol

### Transcript annotation

Use two passes:

1. trained transcriber creates the reference;
2. veterinarian or clinically trained reviewer verifies medical terms,
   medication, dosage, negation, and speaker attribution.

Maintain:

- annotation guidelines;
- uncertainty markers;
- inaudible spans;
- non-speech events;
- speaker turns;
- verbatim and normalized transcript separately.

Never silently "clean up" grammar in the verbatim reference.

### Clinical note annotation

Have at least two veterinarians annotate a subset.

Score:

- completeness;
- factual consistency with transcript;
- clinically significant omission;
- unsupported statement/hallucination;
- wrong patient/species;
- negation error;
- medication/dosage error;
- usability after edits.

Measure inter-annotator agreement. Disagreement is useful research data, not
noise to hide.

## Evaluation

### ASR metrics

Report:

- raw and normalized Word Error Rate;
- Character Error Rate;
- medical term error rate;
- named entity error rate;
- medication/dosage accuracy;
- negation accuracy;
- speaker attribution error;
- subgroup results;
- real-time factor, memory, energy/hardware, and cost.

WER alone is insufficient. A transcript can have low WER and still turn "no
vomiting" into "vomiting."

### Note metrics

Do not rely on ROUGE/BLEU as the primary safety result.

Use blinded veterinarian review and report:

- factual precision;
- evidence-supported statement rate;
- significant omission rate;
- hallucination rate;
- median edit distance;
- time to finalized note;
- proportion approved without major correction.

### Statistical practice

- preregister hypotheses where possible;
- report confidence intervals;
- bootstrap metrics by clinic/speaker;
- perform subgroup analysis;
- publish failures and limitations;
- preserve experiment manifests and seeds.

## Data Release Models

Raw clinical audio should not automatically become an open download.

Possible tiers:

1. **Open aggregate benchmark**
   - metrics, code, schemas, synthetic examples, and model cards.

2. **De-identified text release**
   - only where re-identification risk is acceptably low and consent permits.

3. **Controlled-access audio**
   - approved researchers, agreement, audit, no redistribution.

4. **No raw release**
   - release evaluation server or derived statistics only.

A valuable paper does not require publishing every recording.

Use a Dataset Card and a Data Statement describing collection, speakers,
languages, consent, intended uses, excluded uses, representation, known bias,
and maintenance.

## Research Data Governance

Create these tables before the first research recording:

- `research_consents`
- `research_samples`
- `research_annotations`
- `research_annotation_assignments`
- `research_dataset_versions`
- `research_experiments`
- `research_model_runs`
- `research_withdrawals`

Required capabilities:

- withdrawal by opaque linkage key;
- immutable consent history;
- access logs;
- dataset version hashes;
- annotator confidentiality;
- separation from production identifiers;
- automatic exclusion of withdrawn samples from future dataset builds.

Do not train directly from the mutable production database. Build a
purpose-limited, versioned research dataset after consent and de-identification.

## First 12-Week Plan

### Weeks 1-2: research foundation

- Find one veterinary academic collaborator.
- Find one speech/NLP collaborator or community mentor.
- Write the research question and exclusion criteria.
- Perform a systematic literature and dataset search.
- Draft product, quality, training, publication, and release consent scopes.
- Draft annotation guidelines and a Data Statement.

### Weeks 3-4: baseline harness

- Create a command-line benchmark runner.
- Add faster-whisper small/medium/large candidate adapters.
- Add WER, CER, medical-term, negation, and dosage metrics.
- Create synthetic and staged veterinary audio before real collection.

### Weeks 5-8: pilot collection

- Collect a small, consented, diverse pilot.
- Keep the locked test set untouched.
- Double-annotate medical terms and safety-critical spans.
- Record device/noise/language metadata.

### Weeks 9-10: note benchmark

- Benchmark one 4B and one 8B quantized instruction model.
- Use identical JSON schema and prompts.
- Run blinded veterinarian review.
- Analyse edits and clinically significant errors.

### Weeks 11-12: decision

- Choose the smallest model that passes the agreed quality threshold.
- Publish a preprint only if ethics, consent, methodology, and sample size
  support the claims.
- Otherwise publish the protocol, tooling, and preliminary benchmark honestly.

## Model Selection Rule

The production model is:

> the cheapest model that meets the veterinarian-approved safety threshold on
> the locked target-market test set.

It is not:

> the newest model, the largest model, or the model with the best generic
> leaderboard score.

## References

- [OpenAI Whisper](https://github.com/openai/whisper)
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
- [NVIDIA NeMo Speech](https://github.com/NVIDIA-NeMo/NeMo)
- [Seamless Communication](https://github.com/facebookresearch/seamless_communication)
- [Masakhane dataset registry](https://github.com/masakhane-io/masakhane-community/blob/master/list-of-datasets.md)
- [DSFSI African datasets registry](https://github.com/dsfsi/dsfsi-datasets)
- [llama.cpp](https://github.com/ggml-org/llama.cpp)
- [Hugging Face PEFT](https://github.com/huggingface/peft)
- [Hugging Face WER implementation](https://github.com/huggingface/evaluate/blob/main/metrics/wer/wer.py)
- [Data Statements for NLP](https://aclanthology.org/Q18-1041/)
- [Nigeria Data Protection Commission](https://ndpc.gov.ng/)

