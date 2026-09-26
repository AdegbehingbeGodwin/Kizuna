# Kizuna Product Roadmap

## Product Position

Kizuna should become the clinical memory and care-continuity platform for veterinary clinics operating with fragmented records, uneven connectivity, and WhatsApp-first client communication.

The entry product is an AI clinical scribe. The long-term product is the system that connects:

1. What happened during the consultation.
2. What belongs in the medical record.
3. What the owner needs to understand.
4. What the clinic needs to do next.

Kizuna should match the useful capabilities of established veterinary AI platforms without copying their brand or trying to ship their entire product surface at once.

## VetRec Capability Map

The public VetRec product currently includes or advertises:

| Capability | What it does | Kizuna approach | Priority |
| --- | --- | --- | --- |
| AI scribe | Records consultations and drafts clinical notes | Audio capture, transcription, SOAP/custom note generation, clinician review | P0 |
| Templates | Adapts notes to clinician and visit format | Clinic, clinician, species, and visit-type templates | P0 |
| Record recap | Summarizes long patient histories | Upload files or select timeline entries and generate a cited case brief | P1 |
| Intake | Turns incoming email and records into structured information | Email forwarding, file upload, OCR, and patient matching | P1 |
| Phone calling | Records calls and adds structured notes to the medical record | Mobile/web call capture with consent and patient linking | P2 |
| Case board | Coordinates active cases across a team | Shared patient tasks, handoffs, status, and unresolved actions | P2 |
| Coaching | Reviews consultation or communication quality | Private clinician feedback after note quality is proven | P3 |
| AI receptionist | Handles calls and front-desk workflows | Start with WhatsApp intake and booking before voice automation | P3 |
| Enterprise controls | SSO, roles, retention, support, reliability | Role-based access, audit logs, retention, exports, then SSO | P1-P3 |
| Mobile apps | Captures work away from a desktop | Responsive PWA first; native app only after repeat mobile demand | P1 |
| PIMS integration | Moves information into existing practice systems | Reliable export and copy first, targeted integrations second | P1-P2 |

## Kizuna's Unique Point

### The differentiator

**Kizuna turns a clinical note into the next care action, even in clinics where records are split across paper, spreadsheets, and chat.**

This is stronger than "VetRec built in Africa." It names a specific product advantage:

- Clinical documentation.
- Paper and file digitization.
- Patient timeline and record recap.
- WhatsApp discharge, recall, and follow-up.
- Low-bandwidth capture and delayed synchronization.
- Market-specific language, currency, workflows, and data residency.

### Why a solo founder can win here

A solo founder cannot outbuild a funded competitor feature-for-feature. A solo founder can:

- Work directly with five clinics and learn faster.
- Support one launch geography extremely well.
- Build around WhatsApp instead of treating it as an integration.
- Onboard clinics with paper and spreadsheet records competitors may avoid.
- Make implementation and support feel personal.
- Keep the product narrow until a daily habit is established.

The moat begins as workflow depth and customer proximity. It can later become proprietary evaluation data, clinic templates, integrations, and a structured longitudinal veterinary dataset.

## Product Sequence

### Phase 0: Design partners

Timebox: 2-4 weeks.

- Recruit 3-5 clinics in one city or country.
- Observe at least 20 real consultations with consent.
- Collect de-identified examples of acceptable SOAP notes.
- Agree on success measures before building.
- Select one initial language and species mix.
- Write the consent, privacy, and deletion workflow.

Exit criteria:

- Clinics agree to test weekly.
- At least 100 representative note examples exist.
- A veterinarian defines what makes a generated note unacceptable.

### Phase 1: The daily wedge

Timebox: 6-10 weeks.

- Browser/mobile audio recording.
- Audio upload and transcription.
- SOAP and custom note drafts.
- Editable clinic and clinician templates.
- Patient and owner linking.
- Draft, reviewed, and finalized states.
- Edit history and approval attribution.
- Copy, PDF, and structured export.
- WhatsApp discharge instructions and follow-up reminders.
- Basic usage and failure analytics.

Do not add campaigns, AI reception, coaching, or deep integrations during this phase unless they block a design partner from using the core workflow.

Exit criteria:

- A clinician can finish a note faster than their previous workflow.
- The note is clinically usable after review.
- No audio or patient data is lost.
- At least three clinics use it every week.
- At least one clinic pays.

### Phase 2: Clinic memory

Timebox: 8-12 weeks after Phase 1 retention.

- Record recap with source references.
- PDF, image, lab, referral, and email intake.
- OCR migration for paper records.
- Duplicate patient detection and merge review.
- Team roles and clinic workspaces.
- Audit logs and configurable retention.
- Low-bandwidth upload queue and retry.
- PWA installation and offline capture metadata.
- Repeatable clinic onboarding and template setup.

Exit criteria:

- A new clinic can onboard without founder-led data cleanup.
- Summaries show their source documents.
- Clinics trust Kizuna as the first place to review patient history.

### Phase 3: Care operations

- Shared case board and handoffs.
- Phone and voice-note documentation.
- Automated follow-up tasks.
- Booking and calendar integrations.
- PIMS integrations selected by customer concentration.
- Clinic-level quality and workflow analytics.

### Phase 4: Front desk and intelligence

- WhatsApp intake assistant.
- Voice receptionist only where telephony economics work.
- Clinician coaching with private, transparent scoring.
- Multi-location controls, SSO, and enterprise support.
- Additional countries, languages, and regional compliance packs.

## Product Rules

- AI output is always a draft until a clinician approves it.
- Never hide uncertainty. Flag missing, conflicting, or low-confidence details.
- Record which source and model produced each draft.
- Never train on clinic data without explicit contractual permission.
- Make export and deletion straightforward.
- Prefer a reliable manual bridge over a brittle integration.
- Add features from observed repeated demand, not competitor navigation menus.

## Initial Metrics

Measure these from the first pilot:

- Median time from consultation end to finalized note.
- Percentage of generated drafts finalized.
- Median number and type of clinician edits.
- Clinically significant omission rate.
- Transcription failure rate.
- Weekly active clinicians and retained clinics.
- Follow-up messages sent from finalized care plans.
- Pilot-to-paid conversion.

Do not market a time-saving or accuracy claim until the pilot data supports it.

## Business Model

Start with simple clinic pricing:

- A limited pilot for design partners.
- One paid plan per clinician with a fair-use recording allowance.
- A clinic plan with shared templates, team controls, and onboarding.
- Usage-based overage only for unusually high transcription volume.

Avoid a large free tier. It creates support and AI costs before product-market fit. Offer a short trial or a founder-led pilot with explicit limits.

## Defensibility Over Time

1. Best workflow for fragmented veterinary records.
2. Deep WhatsApp care-continuity automation.
3. Market-specific templates and terminology.
4. Evaluation datasets built with veterinarian-reviewed edits.
5. Clinic onboarding playbooks and migration tooling.
6. Targeted integrations in the markets Kizuna dominates.

