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

## 🔐 Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
KAPSO_API_KEY=your_kapso_api_key
KAPSO_PHONE_NUMBER_ID=your_phone_id
DATABASE_URL=sqlite:///kizuna.db  # or PostgreSQL URL
```

## 🌐 Deployment

For Railway/Render:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
