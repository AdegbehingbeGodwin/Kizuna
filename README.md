<div align="center">
  
# 🐾 Kizuna

**The AI Operating System for Modern Veterinary Clinics**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini_2.0-4285F4?logo=google)](https://ai.google.dev)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🌟 Features

- **🤖 AI-Powered Reminders** — Gemini AI crafts personalized WhatsApp messages for vaccinations and checkups
- **📊 Revenue Tracking** — Real-time dashboard showing conversions and estimated revenue
- **📣 Campaign Blasters** — One-click WhatsApp marketing for promotions and events
- **🗂️ Patient Database** — Beautiful, searchable records with owner contacts and visit history
- **📱 Telegram OCR Bot** — Digitize paper records by simply snapping a photo

---

## 📁 Project Structure

```
kizuna/
├── backend/                  # Python FastAPI backend
│   ├── main.py               # API entry point
│   ├── services/             # Business logic modules
│   │   ├── database.py       # Database operations
│   │   ├── gemini_service.py # AI integration
│   │   └── kapso_service.py  # WhatsApp integration
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment template
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx           # Main application
│   │   ├── components/       # UI components
│   │   ├── services/         # API services
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration
│
├── docs/                     # Documentation
│   └── schema.sql            # Database schema
│
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **API Keys**: [Gemini AI](https://ai.google.dev), [Kapso](https://kapso.ai) (WhatsApp)

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/kizuna.git
cd kizuna
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
python main.py
```

> Backend runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

> Frontend runs at `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | ✅ |
| `KAPSO_API_KEY` | Kapso WhatsApp API key | ✅ |
| `KAPSO_PHONE_NUMBER_ID` | WhatsApp phone number ID | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ❌ |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_BACKEND_URL` | Backend API URL | ❌ |
| `VITE_GEMINI_API_KEY` | Client-side AI key | ❌ |

---

## 🌐 Deployment

### Frontend → Vercel

1. Import repository to [Vercel](https://vercel.com)
2. Set **Root Directory**: `frontend`
3. Add environment variables
4. Deploy!

### Backend → Railway/Render

1. Create project on [Railway](https://railway.app) or [Render](https://render.com)
2. Set **Root Directory**: `backend`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables
5. Deploy!

---

## 📚 Documentation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pets` | List all patients |
| `POST` | `/api/pets` | Add new patient |
| `POST` | `/api/reminders/generate` | Generate AI message |
| `POST` | `/api/reminders/send` | Send WhatsApp reminder |
| `GET` | `/api/health` | Health check |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Framer Motion, Tailwind CSS |
| **Backend** | Python 3.10+, FastAPI, SQLite/PostgreSQL |
| **AI** | Google Gemini 2.0 Flash |
| **Messaging** | Kapso WhatsApp API |

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ for veterinarians worldwide</p>
  <p>© 2026 Kizuna Inc.</p>
</div>
