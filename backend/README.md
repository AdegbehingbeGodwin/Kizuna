# Kizuna Backend

Python FastAPI backend for the Kizuna veterinary platform.

## 🚀 Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
python main.py
```

Server runs at `http://localhost:5000`

## 📁 Structure

```
backend/
├── main.py              # FastAPI entry point & routes
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── services/            # Business logic
    ├── database.py      # SQLite/PostgreSQL operations
    ├── gemini_service.py # Google Gemini AI integration
    └── kapso_service.py # Kapso WhatsApp API integration
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/pets` | List all patients |
| `POST` | `/api/pets` | Create new patient |
| `POST` | `/api/reminders/generate` | Generate AI message |
| `POST` | `/api/reminders/send` | Send via WhatsApp |
| `POST` | `/api/whatsapp/send-template` | Send an approved WhatsApp template |
| `POST` | `/api/whatsapp/send-interactive` | Send buttons, lists, CTAs, or a Flow |
| `POST` | `/api/webhooks/kapso` | Receive signed Kapso events |
| `GET` | `/api/whatsapp/conversations` | List persisted WhatsApp conversations |

## 🔐 Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
KAPSO_API_KEY=your_kapso_api_key
KAPSO_PHONE_NUMBER_ID=your_phone_id
KAPSO_VERSION=v24.0
KAPSO_WEBHOOK_SECRET=your_webhook_secret
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Supabase setup

Run `docs/supabase_schema.sql` in your Supabase SQL editor before starting the backend.
Then follow `docs/TENANT_SETUP.md` to configure Supabase Auth, frontend public keys, clinic onboarding, roles, and tenant verification.

## Kapso setup

Follow `docs/KAPSO_SETUP.md` to connect a number, create Meta templates, register signed webhooks, and test inbound and outbound messages.

## 🌐 Deployment

For Railway/Render:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
