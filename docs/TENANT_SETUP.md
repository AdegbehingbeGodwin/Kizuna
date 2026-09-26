# Kizuna Tenant Setup

Kizuna now derives tenant identity from the authenticated Supabase user. The browser never chooses `clinic_id`.

## Tenant Behaviour

- A new user signs up through Supabase Auth.
- After email confirmation and login, the user creates a clinic workspace.
- The account matching `LEGACY_CLINIC_OWNER_EMAIL` can claim the legacy clinic and its records when no memberships exist.
- Every later account receives a new clinic.
- The creator becomes that clinic's `owner`.
- Pets, campaigns, drafts, settings, WhatsApp contacts, conversations, messages, accounts, and consent records are scoped by clinic.
- Backend queries apply explicit `clinic_id` filters even though the service-role client bypasses RLS.
- PostgreSQL RLS provides a second boundary for authenticated direct database access.

## Supabase Dashboard Configuration

1. Run `docs/supabase_schema.sql` in the SQL editor.
2. Open **Authentication > Providers > Email**.
3. Enable email/password sign-in.
4. Enable email confirmation for production.
5. Configure the production site URL and allowed redirect URLs.
6. Copy the project URL and public anonymous key into `frontend/.env.local`.
7. Keep the service-role key only in the backend environment.

Frontend environment:

```env
VITE_BACKEND_URL=http://127.0.0.1:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

Backend environment:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
LEGACY_CLINIC_OWNER_EMAIL=founder@yourdomain.com
```

The anonymous key is intended for browser use. The service-role key is not.
Set `LEGACY_CLINIC_OWNER_EMAIL` before opening public signup. Without an exact match, new users receive clean clinics and cannot claim existing data.

## Roles

- `owner`: full clinic administration.
- `admin`: clinic settings and operations.
- `veterinarian`: patient, campaign, and clinical approval actions.
- `nurse`: patient and messaging workflows.
- `receptionist`: patient and messaging workflows.

Clinic settings changes require `owner` or `admin`. Draft approval requires `owner`, `admin`, or `veterinarian`.

## WhatsApp Isolation

Each production clinic should have a row in `whatsapp_accounts` with its own `clinic_id` and Kapso `phone_number_id`.

Authenticated WhatsApp routes refuse to send when the current clinic has no connected account. They do not accept `clinicId` or `phoneNumberId` from the browser.

For the first clinic, assign the existing Kapso number after running the migration:

```sql
insert into whatsapp_accounts (
  clinic_id,
  phone_number_id,
  status,
  is_default
) values (
  '00000000-0000-0000-0000-000000000001',
  'YOUR_KAPSO_PHONE_NUMBER_ID',
  'connected',
  true
)
on conflict (phone_number_id) do update
set clinic_id = excluded.clinic_id,
    status = excluded.status;
```

## Telegram Isolation

Telegram imports have no interactive Kizuna login. Set `TELEGRAM_DEFAULT_CLINIC_ID` explicitly or Telegram patient imports are rejected.

## Verification

After migration:

1. Create Account A and Clinic A.
2. Add a patient.
3. Sign out.
4. Create Account B and Clinic B.
5. Confirm Clinic B has no patients, campaigns, settings, or conversations from Clinic A.
6. Attempt to request Clinic A's patient UUID while authenticated as Account B; the API should return `404`.
7. Confirm anonymous requests to `/api/pets` return `401`.
