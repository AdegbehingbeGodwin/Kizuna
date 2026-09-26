# ADR 002: Open-Source-Model-First Inference

Date: 2026-06-10  
Status: Accepted for initial implementation

## Context

Kizuna is currently built by one founder with little infrastructure budget.
The product also has a potential research contribution in African veterinary
speech and clinical documentation.

Always-on commercial inference APIs create variable cost and provider
dependency. Always-on self-hosted GPUs create fixed cost and operational burden.

## Decision

1. Use faster-whisper as the first local ASR baseline.
2. Use a quantized 4B-9B permissively licensed instruction model through
   llama.cpp or Ollama for the first local note-generation experiments.
3. Keep ASR and note generation behind provider-neutral adapters.
4. Process asynchronously; realtime latency is not an initial requirement.
5. Use short-lived rented or partner-provided GPUs for larger benchmark and
   fine-tuning jobs.
6. Select production models using a locked, veterinarian-reviewed target-market
   evaluation set.
7. Do not fine-tune until prompt/schema baselines and error analysis exist.
8. Paid APIs may be evaluated or used as fallbacks, but are not required for
   core data recovery.

## Consequences

### Positive

- Near-zero fixed inference cost during development.
- Reproducible research baselines.
- Better data-control options.
- Less provider lock-in.
- Ability to adapt models after sufficient consented data exists.

### Negative

- Slower drafts on CPU hardware.
- More responsibility for model packaging and evaluation.
- Open-model licences require checkpoint-specific review.
- High-quality training still requires access to GPU compute.

## Guardrail

Kizuna will not advertise that open-source inference is free. Hardware,
electricity, storage, maintenance, and founder time are real costs.

