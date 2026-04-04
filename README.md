# SFCC Diagnostic Suite — Bluepanda

An adaptive, AI-powered technical assessment tool for **Salesforce B2C Commerce (SFCC)** developers. It evaluates candidates across 15 core SFCC topics using a dynamic question engine and Google Gemini to score answers and generate a personalised competency report.

---

## Features

- **Adaptive question engine** — starts at mid-level difficulty and adjusts up or down based on each answer's score
- **AI-powered evaluation** — every free-text answer is scored 0–10 by Gemini, with reasoning
- **Skill map radar chart** — visual breakdown of performance per topic
- **Seniority classification** — auto-detected as Junior, Mid, or Senior based on overall performance
- **Curriculum path recommendation** — 8-week, 12-week, or 15-week learning path tailored to gaps
- **Firebase persistence** — completed assessments are saved to Firestore for later review
- **Admin dashboard** — Google-authenticated view of all saved assessments (navigate to `/#admin`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer Motion) |
| Charts | Recharts |
| AI evaluation | Google Gemini (`@google/genai`) |
| Backend storage | Firebase Firestore |
| Auth (admin) | Firebase Auth — Google Sign-In |

---

## Knowledge Base Topics

The assessment covers **45 questions across 15 topics** (3 difficulty levels each: junior, mid, senior):

1. SFRA Internals
2. Cartridge Architecture & Resolution
3. Multi-site & Multi-locale Architecture
4. Page Designer Architecture
5. OCAPI Data API
6. OCAPI Shop API
7. SCAPI
8. Checkout Architecture
9. Payment Gateway Integrations
10. OMS / ERP / PIM Integrations
11. Inventory & Pricing Architecture
12. Jobs & Schedulers
13. Caching Strategies
14. Performance Optimization
15. Security Best Practices

---

## How It Works

1. The candidate enters their name and starts the assessment.
2. The **adaptive engine** (`src/engine/adaptive.ts`) selects a mid-level question to begin.
3. After each answer the engine calls Gemini to score it:
   - Score ≥ 7 → escalate to senior difficulty or move to a new topic at a higher level
   - Score < 7 → drop to mid/junior difficulty or switch topics
4. The session ends when all questions are exhausted, or the candidate types `stop`.
5. Gemini generates a **final report** with a skill map, seniority classification, curriculum path, strengths, weaknesses, and next steps.
6. The report is saved to Firestore and displayed to the candidate.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A Firebase project with Firestore and Google Auth enabled

### Installation

```bash
npm install
```

### Configuration

1. Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

```env
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
```

2. Update `firebase-applet-config.json` with your Firebase project credentials.

### Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for production

```bash
npm run build
```

### Type-check

```bash
npm run lint
```

---

## Firestore Security Rules

Assessment results can be **written** by anyone (unauthenticated), but are strictly validated against a schema. **Reading, updating, and deleting** records requires admin authentication (Google account with the configured admin email). Deploy the rules in `firestore.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

---

## Admin Dashboard

Navigate to `/#admin` in the browser to access the admin view. Sign in with the configured admin Google account to browse all historical assessments, view per-candidate skill maps, and inspect individual question/answer histories.

---

## Project Structure

```
src/
├── data/
│   └── kb.json              # Knowledge base: 15 topics × 3 difficulty levels
├── engine/
│   └── adaptive.ts          # Adaptive question selection logic
├── services/
│   └── gemini.ts            # Gemini API calls: evaluate answer + generate report
├── components/
│   ├── AdminDashboard.tsx   # Admin view (Firestore + Google Auth)
│   └── RadarChart.tsx       # Skill map radar chart
├── firebase.ts              # Firebase initialisation & error handling
├── types.ts                 # Shared TypeScript types
├── App.tsx                  # Main application state machine & UI
└── main.tsx                 # Entry point
```
