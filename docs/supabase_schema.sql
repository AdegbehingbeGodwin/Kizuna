-- Kizuna Supabase schema (PostgreSQL)
-- Run this in the Supabase SQL editor before starting the backend.

create extension if not exists pgcrypto;

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clinic_memberships (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'veterinarian', 'nurse', 'receptionist')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create index if not exists idx_clinic_memberships_user
  on clinic_memberships(user_id, status);

insert into clinics (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Legacy Kizuna Clinic', 'legacy-kizuna-clinic')
on conflict (id) do nothing;

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default '00000000-0000-0000-0000-000000000001'
    references clinics(id) on delete cascade,
  name text not null,
  species text,
  breed text,
  sex text,
  color text,
  age text,
  weight text,
  owner_name text not null,
  owner_phone text not null,
  status text default 'Healthy',
  birthday date,
  last_vaccination_date date,
  next_vaccination_date date,
  last_deworming_date date,
  last_checkup_date date,
  medical_history jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_pets_created_at on pets(created_at desc);
create index if not exists idx_pets_clinic_created_at on pets(clinic_id, created_at desc);
create index if not exists idx_pets_species on pets(species);
create index if not exists idx_pets_status on pets(status);
create index if not exists idx_pets_next_vaccination_date on pets(next_vaccination_date);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default '00000000-0000-0000-0000-000000000001'
    references clinics(id) on delete cascade,
  name text not null,
  message text not null,
  target_audience text,
  status text default 'draft',
  sent_count integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_campaigns_created_at on campaigns(created_at desc);
create index if not exists idx_campaigns_clinic_created_at on campaigns(clinic_id, created_at desc);

create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default '00000000-0000-0000-0000-000000000001'
    references clinics(id) on delete cascade,
  pet_id uuid references pets(id) on delete cascade,
  type text,
  draft_message text,
  status text default 'pending_review',
  created_at timestamptz default now()
);

create index if not exists idx_drafts_status_created_at on drafts(status, created_at desc);
create index if not exists idx_drafts_clinic_status on drafts(clinic_id, status, created_at desc);
create index if not exists idx_drafts_pet_id on drafts(pet_id);

create table if not exists clinic_settings (
  clinic_id uuid not null references clinics(id) on delete cascade,
  key text not null,
  value text,
  primary key (clinic_id, key)
);

-- Kept only as a one-time migration source for pre-tenant installations.
create table if not exists settings (
  key text primary key,
  value text
);

insert into clinic_settings (clinic_id, key, value) values
  ('00000000-0000-0000-0000-000000000001', 'clinic_name', 'Kizuna Vet Center'),
  ('00000000-0000-0000-0000-000000000001', 'booking_url', 'https://book.vet/kizuna'),
  ('00000000-0000-0000-0000-000000000001', 'ai_tone', 'friendly')
on conflict (clinic_id, key) do nothing;

-- WhatsApp accounts are clinic-ready. `clinic_id` is nullable until Kizuna
-- introduces authenticated clinic workspaces.
create table if not exists whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  phone_number_id text not null unique,
  business_account_id text,
  display_phone_number text,
  verified_name text,
  connection_type text,
  status text not null default 'connected',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists idx_whatsapp_accounts_one_default;
create unique index if not exists idx_whatsapp_accounts_one_default_per_clinic
  on whatsapp_accounts(clinic_id)
  where is_default = true;
create index if not exists idx_whatsapp_accounts_clinic_id
  on whatsapp_accounts(clinic_id);

create table if not exists whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  pet_id uuid references pets(id) on delete set null,
  phone_number text,
  business_scoped_user_id text,
  parent_business_scoped_user_id text,
  username text,
  display_name text,
  opted_out_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_contact_identity check (
    phone_number is not null or business_scoped_user_id is not null
  )
);

create unique index if not exists idx_whatsapp_contacts_phone
  on whatsapp_contacts(clinic_id, phone_number)
  where phone_number is not null;
create unique index if not exists idx_whatsapp_contacts_bsuid
  on whatsapp_contacts(clinic_id, business_scoped_user_id)
  where business_scoped_user_id is not null;

create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  whatsapp_account_id uuid references whatsapp_accounts(id) on delete set null,
  contact_id uuid references whatsapp_contacts(id) on delete set null,
  external_conversation_id text,
  status text not null default 'open',
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_whatsapp_conversations_external
  on whatsapp_conversations(external_conversation_id)
  where external_conversation_id is not null;
create index if not exists idx_whatsapp_conversations_contact
  on whatsapp_conversations(contact_id, last_message_at desc);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  whatsapp_account_id uuid references whatsapp_accounts(id) on delete set null,
  conversation_id uuid references whatsapp_conversations(id) on delete set null,
  contact_id uuid references whatsapp_contacts(id) on delete set null,
  pet_id uuid references pets(id) on delete set null,
  draft_id uuid references drafts(id) on delete set null,
  whatsapp_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null,
  status text not null default 'queued',
  from_number text,
  to_number text,
  content text,
  template_name text,
  error_code text,
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_conversation
  on whatsapp_messages(conversation_id, created_at desc);
create index if not exists idx_whatsapp_messages_status
  on whatsapp_messages(status, created_at desc);
create index if not exists idx_whatsapp_messages_pet
  on whatsapp_messages(pet_id, created_at desc);

create table if not exists whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_type text not null,
  phone_number_id text,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_webhook_events_created_at
  on whatsapp_webhook_events(created_at desc);

create table if not exists communication_consents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  contact_id uuid references whatsapp_contacts(id) on delete cascade,
  channel text not null default 'whatsapp',
  purpose text not null,
  status text not null check (status in ('granted', 'revoked')),
  source text,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists idx_communication_consents_contact
  on communication_consents(contact_id, purpose, captured_at desc);

create table if not exists care_cases (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  contact_id uuid references whatsapp_contacts(id) on delete set null,
  latest_message_id uuid references whatsapp_messages(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  audience text not null default 'unknown'
    check (audience in ('pet_owner', 'farm_owner', 'unknown')),
  intent text not null default 'unknown',
  urgency text not null default 'needs_information'
    check (urgency in ('emergency', 'urgent', 'routine', 'needs_information')),
  status text not null default 'open'
    check (status in ('open', 'needs_human', 'in_review', 'resolved', 'closed')),
  summary text,
  suggested_action text,
  requires_human boolean not null default false,
  red_flags jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  assistant_provider text,
  last_owner_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_care_cases_clinic_status
  on care_cases(clinic_id, status, updated_at desc);
create index if not exists idx_care_cases_conversation
  on care_cases(conversation_id, updated_at desc);

create table if not exists care_case_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  care_case_id uuid not null references care_cases(id) on delete cascade,
  source_message_id uuid references whatsapp_messages(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_care_case_events_case
  on care_case_events(care_case_id, created_at desc);

-- Idempotent migration for databases created before multi-tenancy.
alter table pets add column if not exists clinic_id uuid references clinics(id) on delete cascade;
alter table campaigns add column if not exists clinic_id uuid references clinics(id) on delete cascade;
alter table drafts add column if not exists clinic_id uuid references clinics(id) on delete cascade;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'whatsapp_accounts',
    'whatsapp_contacts',
    'whatsapp_conversations',
    'whatsapp_messages',
    'communication_consents'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = 'clinic_id'
        and data_type = 'text'
    ) then
      execute format(
        'alter table %I alter column clinic_id type uuid using
         case when clinic_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
         then clinic_id::uuid else null end',
        target_table
      );
    end if;
  end loop;
end $$;

do $$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array[
    'whatsapp_accounts',
    'whatsapp_contacts',
    'whatsapp_conversations',
    'whatsapp_messages',
    'communication_consents'
  ]
  loop
    constraint_name := target_table || '_clinic_id_fkey';
    if not exists (
      select 1 from pg_constraint where conname = constraint_name
    ) then
      execute format(
        'alter table %I add constraint %I foreign key (clinic_id) references clinics(id) on delete cascade',
        target_table,
        constraint_name
      );
    end if;
  end loop;
end $$;

update pets set clinic_id = '00000000-0000-0000-0000-000000000001' where clinic_id is null;
update campaigns set clinic_id = '00000000-0000-0000-0000-000000000001' where clinic_id is null;
update drafts set clinic_id = '00000000-0000-0000-0000-000000000001' where clinic_id is null;

alter table pets alter column clinic_id set not null;
alter table campaigns alter column clinic_id set not null;
alter table drafts alter column clinic_id set not null;

insert into clinic_settings (clinic_id, key, value)
select '00000000-0000-0000-0000-000000000001', key, value
from settings
where key not in ('kapso_api_key', 'kapso_phone_id', 'telegram_token')
on conflict (clinic_id, key) do update set value = excluded.value;

drop table if exists settings;

-- Membership helper used by every RLS policy.
create or replace function public.is_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_memberships
    where clinic_id = target_clinic_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_clinic_role(target_clinic_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from clinic_memberships
    where clinic_id = target_clinic_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(allowed_roles)
  );
$$;

grant execute on function public.is_clinic_member(uuid) to authenticated;
grant execute on function public.has_clinic_role(uuid, text[]) to authenticated;

alter table clinics enable row level security;
alter table profiles enable row level security;
alter table clinic_memberships enable row level security;
alter table pets enable row level security;
alter table campaigns enable row level security;
alter table drafts enable row level security;
alter table clinic_settings enable row level security;
alter table whatsapp_accounts enable row level security;
alter table whatsapp_contacts enable row level security;
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_webhook_events enable row level security;
alter table communication_consents enable row level security;
alter table care_cases enable row level security;
alter table care_case_events enable row level security;

drop policy if exists clinics_member_select on clinics;
create policy clinics_member_select on clinics
  for select to authenticated
  using (public.is_clinic_member(id));

drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists memberships_self_select on clinic_memberships;
create policy memberships_self_select on clinic_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.has_clinic_role(clinic_id, array['owner', 'admin']));

drop policy if exists pets_member_all on pets;
create policy pets_member_all on pets
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists campaigns_member_all on campaigns;
create policy campaigns_member_all on campaigns
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists drafts_member_all on drafts;
create policy drafts_member_all on drafts
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists clinic_settings_member_select on clinic_settings;
create policy clinic_settings_member_select on clinic_settings
  for select to authenticated using (public.is_clinic_member(clinic_id));

drop policy if exists clinic_settings_admin_write on clinic_settings;
create policy clinic_settings_admin_write on clinic_settings
  for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin']));

drop policy if exists whatsapp_accounts_member_select on whatsapp_accounts;
create policy whatsapp_accounts_member_select on whatsapp_accounts
  for select to authenticated using (public.is_clinic_member(clinic_id));

drop policy if exists whatsapp_contacts_member_all on whatsapp_contacts;
create policy whatsapp_contacts_member_all on whatsapp_contacts
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists whatsapp_conversations_member_all on whatsapp_conversations;
create policy whatsapp_conversations_member_all on whatsapp_conversations
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists whatsapp_messages_member_all on whatsapp_messages;
create policy whatsapp_messages_member_all on whatsapp_messages
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists communication_consents_member_all on communication_consents;
create policy communication_consents_member_all on communication_consents
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists care_cases_member_all on care_cases;
create policy care_cases_member_all on care_cases
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

drop policy if exists care_case_events_member_all on care_case_events;
create policy care_case_events_member_all on care_case_events
  for all to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));
