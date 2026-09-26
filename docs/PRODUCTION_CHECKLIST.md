# Kizuna Production Checklist

This is the minimum technical and operational work required before Kizuna handles real clinic audio or patient records in production.

## 1. Product Scope

- Define the exact production workflow and features included in the first release.
- Mark all AI-generated content as a draft.
- Require clinician review before finalization or export.
- Define supported browsers, devices, countries, languages, and species.
- Document known failure modes and the human fallback.

## 2. Legal, Privacy, and Clinical Risk

- Engage a lawyer familiar with health data and the launch country.
- Identify the applicable data-protection authority and registration obligations.
- Publish Terms of Service, Privacy Policy, Cookie Policy, and acceptable-use terms.
- Create a Data Processing Agreement for clinics.
- Document every subprocesser, AI provider, hosting provider, and data location.
- Obtain explicit recording consent appropriate to the jurisdiction.
- Define retention and deletion periods for audio, transcripts, notes, and logs.
- Add clinic data export, account deletion, and patient deletion workflows.
- State that Kizuna does not replace professional judgement.
- Establish a clinical safety review process with licensed veterinarians.
- Purchase appropriate cyber and professional liability insurance when feasible.

## 3. Architecture

- Use separate development, staging, and production environments.
- Replace hard-coded backend URLs with environment-based configuration.
- Remove all client-side AI API keys. AI calls must go through the backend.
- Move from CDN Tailwind to a compiled production CSS setup.
- Split the public landing page and authenticated dashboard into separate lazy-loaded bundles.
- Define tenant isolation: every record must belong to a clinic workspace.
- Add background jobs for transcription, note generation, OCR, and messaging.
- Use an object store for encrypted audio and uploaded files.
- Use PostgreSQL migrations with rollback and tested backups.
- Add a queue with idempotency, retries, dead-letter handling, and job status.
- Version prompts, templates, output schemas, and models.
- Store provenance for every generated note.
- Define a provider abstraction so one AI vendor outage does not stop the product.

Suggested initial stack:

- Frontend: React/Vite PWA or Next.js.
- API: FastAPI.
- Database and auth: managed PostgreSQL plus a mature auth provider.
- Storage: S3-compatible private object storage.
- Queue: managed Redis/worker system or a managed task queue.
- Observability: Sentry plus structured logs and uptime monitoring.
- Product analytics: privacy-conscious event analytics.
- Email: managed transactional email.
- Messaging: official WhatsApp Business Platform provider.

## 4. Authentication and Authorization

- Supabase email/password authentication is implemented; enable email confirmation and configure production redirect URLs.
- Add secure password policy if passwords are used.
- Add session expiration, token rotation, logout, and device/session revocation.
- Support roles such as owner, administrator, veterinarian, nurse, and receptionist.
- Enforce authorization in the backend, never only in the UI.
- Run the latest `docs/supabase_schema.sql` migration so every business table has `clinic_id` and RLS enabled.
- Add clinic invitations and membership removal.
- Add MFA for clinic owners and administrators.
- Add rate limiting and bot protection on auth endpoints.
- Log sensitive access and administrative changes.

## 5. Data Security

- Encrypt all traffic with modern TLS.
- Encrypt database, backups, audio, and uploaded records at rest.
- Keep secrets in a managed secret store, not source control or frontend bundles.
- Rotate production secrets and restrict each secret to the minimum scope.
- Use private storage buckets and short-lived signed URLs.
- Scan uploaded files and validate MIME type, extension, and size.
- Validate all API input with strict schemas.
- Add CSRF protection where cookie-based auth is used.
- Configure a strict Content Security Policy and security headers.
- Prevent sensitive data from entering logs, analytics, error messages, and URLs.
- Run dependency, secret, and container scans in CI.
- Commission a penetration test before larger clinic rollout.

## 6. AI and Clinical Safety

- Build a veterinarian-approved evaluation set before launch.
- Test for omissions, invented findings, wrong negation, wrong patient, dosage errors, and species confusion.
- Require structured output validated against a schema.
- Display low-confidence or missing information clearly.
- Keep the original transcript available during review where retention allows.
- Track the clinician's edits without silently treating them as model truth.
- Add prompt-injection defenses for uploaded documents and intake messages.
- Do not allow retrieved content to change system instructions or permissions.
- Run evaluations when prompts, models, or transcription providers change.
- Add a rollback path to the previous model and prompt version.
- Define incident severity for clinically significant AI failures.

## 7. Audio and Transcription

- Ask for recording consent before capture.
- Show a clear recording state and elapsed time.
- Recover safely from tab close, network loss, and interrupted uploads.
- Chunk or resume large uploads.
- Confirm upload completion before deleting a local recording.
- Handle multiple speakers, accents, background noise, and medical terminology.
- Set maximum recording duration and file size.
- Delete raw audio automatically according to clinic policy.
- Never claim a note is complete when transcription failed partially.

## 8. Reliability and Operations

- Add `/health`, readiness, and dependency health endpoints.
- Add structured logs with request and job correlation IDs.
- Add error tracking for frontend, API, workers, and messaging.
- Monitor latency, error rate, queue depth, failed jobs, and storage usage.
- Configure uptime checks and on-call alerts.
- Set database backup frequency and retention.
- Test restoration into a clean environment.
- Define Recovery Point Objective and Recovery Time Objective.
- Add graceful degradation when AI, storage, or WhatsApp is unavailable.
- Create an incident-response runbook and status communication process.
- Add a public status page before serving many clinics.

## 9. Quality Engineering

- Add unit tests for permissions, note state transitions, and billing limits.
- Add integration tests for audio-to-note and note-to-follow-up workflows.
- Add end-to-end tests for clinic signup, patient creation, recording, review, and export.
- Add tenant-isolation tests that attempt cross-clinic access.
- Add migration tests and backup-restore tests.
- Test at 320, 375, 414, 768, 1024, and desktop widths.
- Test keyboard navigation, screen readers, contrast, reduced motion, and zoom.
- Test slow 3G, intermittent connectivity, and offline interruption.
- Create a staging release checklist and production smoke test.

## 10. CI/CD and Environments

- Protect the main branch and require passing checks.
- Run formatting, type checking, tests, dependency scans, and builds in CI.
- Use reproducible lockfiles for frontend and backend dependencies.
- Deploy immutable builds with a recorded version and commit SHA.
- Require database migrations to run as a controlled deployment step.
- Add automatic rollback or a documented one-command rollback.
- Prevent production secrets from being available in preview deployments.
- Seed staging with synthetic data only.

## 11. Billing and Cost Controls

- Choose a payment provider that supports the launch market and target customers.
- Implement subscriptions, invoices, failed-payment handling, cancellation, and tax records.
- Meter audio minutes, transcription, model tokens, storage, and WhatsApp usage.
- Set clinic-level usage limits and internal cost alerts.
- Prevent duplicate billing events with webhook idempotency.
- Verify webhook signatures.
- Model gross margin before choosing plan limits.
- Add an emergency kill switch for runaway AI or messaging spend.

## 12. Customer Operations

- Create a clinic onboarding checklist.
- Create consent scripts and staff training material.
- Provide an in-product way to report an unsafe or incorrect note.
- Define support hours and response expectations honestly.
- Create admin tools for job retry, account recovery, and data export.
- Maintain a product changelog.
- Create a feedback loop with design-partner veterinarians.

## 13. Launch Gates

Do not call the product production-ready until:

- Tenant isolation has been tested.
- Backups have been restored successfully.
- No API key is shipped to the browser.
- Recording consent and deletion are implemented.
- Every final clinical note has an approving user and timestamp.
- AI safety evaluations meet thresholds agreed with veterinary reviewers.
- Monitoring and alerting cover the complete audio-to-note workflow.
- The team can identify and roll back the model, prompt, and code version.
- At least one clinic has completed a controlled pilot without data loss.

## Immediate Repository Issues

Before deploying the current repository:

- `frontend/src/App.tsx` contains a hard-coded production backend URL.
- `frontend/vite.config.ts` exposes Gemini-related environment values to the frontend build.
- The app loads Tailwind from a CDN instead of compiling it.
- The current app has no visible production authentication or clinic tenant boundary.
- Existing dashboard data and state need a complete authorization review.
- The backend and new Supabase changes are currently uncommitted and should be reviewed separately.
