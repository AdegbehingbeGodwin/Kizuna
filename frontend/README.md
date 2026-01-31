# Kizuna Frontend

React + Vite frontend for the Kizuna veterinary platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Structure

```
frontend/
├── src/
│   ├── App.tsx           # Main application component
│   ├── index.tsx         # Entry point
│   ├── index.css         # Global styles
│   ├── types.ts          # TypeScript type definitions
│   ├── constants.tsx     # App constants
│   ├── components/       # UI components
│   │   ├── LandingPage.tsx
│   │   ├── StatsCard.tsx
│   │   ├── PetList.tsx
│   │   ├── DashboardCharts.tsx
│   │   └── CampaignHub.tsx
│   └── services/         # API services
│       └── geminiService.ts
├── public/               # Static assets
├── index.html            # HTML template
├── package.json          # Node dependencies
├── vite.config.ts        # Vite configuration
└── vercel.json           # Vercel deployment config
```

## 🎨 Theme

The app uses a **Dalmatian + Golden Retriever** color scheme:
- Primary: `stone-900` (black)
- Accent: `amber-500` (gold)
- Background: `stone-50` (warm white)

## 🌐 Deployment

Optimized for Vercel deployment:
1. Set root directory to `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
