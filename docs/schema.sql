-- Core tables for veterinary platform Kizuna

-- Clinic / Business profiles
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp_number TEXT,
  telegram_chat_id TEXT,
  booking_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pet records
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id),
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  last_vaccination DATE,
  next_vaccination DATE,
  medical_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Reminders tracking
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES pets(id),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'telegram')),
  message_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id),
  name TEXT NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  target_filter JSONB DEFAULT '{}',
  sent_count INT DEFAULT 0,
  conversion_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data entry logs (for Telegram bot tracking)
CREATE TABLE IF NOT EXISTS data_entry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id),
  source TEXT DEFAULT 'telegram' CHECK (source IN ('telegram', 'manual', 'ocr')),
  raw_input TEXT, -- Path to voice note or image path
  extracted_data JSONB,
  status TEXT DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);
