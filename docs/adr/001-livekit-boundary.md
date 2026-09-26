# ADR 001: LiveKit Boundary

Date: 2026-06-10  
Status: Accepted for initial implementation

## Context

Kizuna needs audio capture for an AI veterinary scribe and may later add live
transcription, phone documentation, and an AI receptionist.

LiveKit provides a WebRTC media platform and an Agents framework for realtime
voice applications. Adopting the full agent stack for the first release would
introduce realtime session lifecycle, room tokens, media workers, provider
streaming, and additional failure/cost modes.

The initial product is a passive capture-to-draft workflow. It does not need to
speak, interrupt, call tools during a conversation, or maintain a realtime
dialogue.

## Decision

1. The first production Scribe will use local chunked recording, resumable
   object-storage upload, and asynchronous processing.
2. LiveKit is not a required dependency for the first release.
3. LiveKit Cloud may be introduced as the media plane when live captions,
   multi-participant rooms, or telephony are validated requirements.
4. Durable audio upload remains the recovery and canonical processing path even
   after realtime media is introduced.
5. LiveKit Agents will be used only for interactive voice experiences such as
   an AI receptionist, not for passive note generation.
6. Kizuna will run a measured LiveKit spike before adoption, testing target
   clinic networks, reconnection, latency, audio quality, provider cost, and
   operational burden.

## Consequences

### Positive

- Faster and simpler initial delivery.
- Better weak-network recovery.
- Lower infrastructure and provider coupling.
- Easier replay, debugging, and clinical evaluation.
- No realtime dependency in the canonical note pipeline.

### Negative

- Partial live transcripts are deferred.
- The first release has longer upload-to-draft latency.
- A later LiveKit integration adds another media path to operate.

## Adoption Trigger

LiveKit should be reconsidered when at least three pilot clinics repeatedly ask
for live transcription, remote participation, phone capture, or interactive
voice, and the requirement cannot be met acceptably with asynchronous capture.

## Rejected Alternative

Use LiveKit Agents immediately for every consultation.

Rejected because the framework solves conversational-agent problems the first
Scribe does not have, while the harder initial risks are recording durability,
clinical accuracy, tenant isolation, and operational recovery.

