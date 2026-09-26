# Kapso WhatsApp Setup for Kizuna

Kizuna uses Kapso as its official WhatsApp transport and event layer. Kizuna remains responsible for patient data, clinical approval, consent, scheduling logic, and the patient timeline.

## What Is Implemented

- Outbound text messages for active customer-service conversations.
- Meta-approved template messages for reminders outside the 24-hour window.
- Interactive messages: buttons, lists, CTA URLs, and WhatsApp Flows.
- Signed Kapso v2 webhook verification.
- Webhook idempotency and duplicate protection.
- Inbound messages, contacts, conversations, and delivery status persistence.
- Support for text, audio transcript, media captions, and interactive replies.
- Batched inbound webhook processing.
- Clinic-ready WhatsApp account records.
- Business-scoped WhatsApp user identifiers.

## 1. Rotate Credentials

Credentials previously placed in `backend/.env.example` must be considered compromised. Rotate:

- Supabase service role key.
- Gemini API key.
- Kapso project API key.
- Telegram bot token.

Never place real credentials in `.env.example`, frontend environment variables, screenshots, support messages, or Git.

## 2. Apply The Database Migration

Run the complete file below in the Supabase SQL editor:

```text
docs/supabase_schema.sql
```

It creates the WhatsApp account, contact, conversation, message, webhook-event, and consent tables. It also removes integration secrets from the old `settings` table.

## 3. Configure The Backend

Create `backend/.env` from `backend/.env.example`:

```env
KAPSO_API_KEY=your_rotated_project_api_key
KAPSO_PHONE_NUMBER_ID=your_connected_phone_number_id
KAPSO_VERSION=v24.0
KAPSO_WEBHOOK_SECRET=a_long_random_webhook_secret
```

`KAPSO_PHONE_NUMBER_ID` is the default pilot number. Later, each clinic can have its own record in `whatsapp_accounts`.

## 4. Connect A WhatsApp Number

In Kapso:

1. Open **Connected numbers**.
2. Use the sandbox for development, or connect a production number.
3. For a small pilot clinic that still uses the WhatsApp Business app, choose **Coexistence**.
4. For an API-only automation number, choose **Dedicated**.
5. Complete Meta embedded signup and display-name review.
6. Copy the resulting phone-number ID into the backend environment.

Connecting the number does not bypass Meta business, display-name, billing, template, or country requirements.

## 5. Register The Webhook

Production URL:

```text
https://YOUR_BACKEND_DOMAIN/api/webhooks/kapso
```

For local testing, expose port `5000` using an HTTPS tunnel and register the temporary HTTPS URL.

Create a WhatsApp webhook for the connected number and subscribe to:

- `whatsapp.message.received`
- `whatsapp.message.sent`
- `whatsapp.message.delivered`
- `whatsapp.message.read`
- `whatsapp.message.failed`
- `whatsapp.conversation.created`
- `whatsapp.conversation.ended`
- `whatsapp.conversation.inactive`

Create a project webhook for:

- `whatsapp.phone_number.created`

Use the exact secret stored in `KAPSO_WEBHOOK_SECRET`. Kizuna rejects unsigned or incorrectly signed events.

Kapso retries failed webhook deliveries. Kizuna stores `X-Idempotency-Key`, so repeated deliveries are processed once.

## 6. Create Meta Templates

Outbound clinic-initiated messages outside the 24-hour customer-service window require approved templates.

Create these utility templates first:

### `appointment_reminder_v1`

```text
Hello {{1}}, this is a reminder that {{2}} has an appointment with {{3}} on {{4}} at {{5}}. Reply to this message if you need help.
```

### `vaccination_due_v1`

```text
Hello {{1}}, {{2}} is due for {{3}}. Please contact {{4}} or use the booking button to choose a date.
```

### `post_visit_followup_v1`

```text
Hello {{1}}, we are checking on {{2}} after the recent visit. Please reply if you have concerns or use the button below to contact the clinic.
```

### `discharge_ready_v1`

```text
Hello {{1}}, the care instructions for {{2}} are ready. Use the secure link below to view them. Contact the clinic if anything is unclear.
```

Do not include unnecessary diagnosis, medication, or sensitive owner information in template text. Link to authenticated Kizuna content when detailed instructions are needed.

Submit templates as `UTILITY` where appropriate. Meta performs the review, which commonly takes up to 24 hours and can take longer for a new account.

## 7. API Examples

### Existing text reminder

Use only during an open customer-service window:

```http
POST /api/reminders/send
Content-Type: application/json

{
  "to": "+2348012345678",
  "message": "Your requested appointment information is ready.",
  "petId": "PET_UUID",
  "draftId": "OPTIONAL_DRAFT_UUID"
}
```

### Template reminder

```http
POST /api/whatsapp/send-template
Content-Type: application/json

{
  "to": "+2348012345678",
  "templateName": "vaccination_due_v1",
  "languageCode": "en",
  "petId": "PET_UUID",
  "components": [
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "Ada"},
        {"type": "text", "text": "Amara"},
        {"type": "text", "text": "rabies vaccination"},
        {"type": "text", "text": "Kizuna Vet Centre"}
      ]
    }
  ]
}
```

### Interactive booking buttons

Use inside an open customer-service window:

```http
POST /api/whatsapp/send-interactive
Content-Type: application/json

{
  "to": "+2348012345678",
  "petId": "PET_UUID",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Would you like to book Amara's follow-up?"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {"id": "book_followup", "title": "Book follow-up"}
        },
        {
          "type": "reply",
          "reply": {"id": "contact_clinic", "title": "Contact clinic"}
        }
      ]
    }
  }
}
```

## 8. Verify The Integration

1. Start the backend.
2. Confirm `/api/health` returns successfully.
3. Send a template to a test owner who has opted in.
4. Confirm a row appears in `whatsapp_messages`.
5. Reply from the test WhatsApp account.
6. Confirm the inbound contact, conversation, message, and webhook event are saved.
7. Check sent, delivered, and read events update the original message.
8. Replay the same webhook with the same idempotency key and confirm it is treated as a duplicate.
9. Change one byte of a signed payload and confirm Kizuna returns `401`.

## 9. Production Requirements

Before real clinic use:

- Add authenticated clinic workspaces and enforce `clinic_id` on every query.
- Put webhook processing on a background queue.
- Add staff inbox and human assignment.
- Add explicit owner consent and opt-out UI.
- Add approved template selection to campaign and reminder screens.
- Add message-window awareness before allowing free-text sends.
- Add monitoring for failed webhooks and failed messages.
- Add secure links for detailed clinical instructions.
- Add clinic-owned number onboarding through Kapso Platform setup links.

## Relevant Kapso Documentation

- https://docs.kapso.ai/docs/introduction
- https://docs.kapso.ai/docs/whatsapp/receive-messages
- https://docs.kapso.ai/docs/platform/webhooks/overview
- https://docs.kapso.ai/docs/platform/webhooks/security
- https://docs.kapso.ai/docs/whatsapp/templates/lifecycle
- https://docs.kapso.ai/docs/platform/setup-links

