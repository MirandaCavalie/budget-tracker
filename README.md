# 💸 Budget Tracker

> Automatic personal finance tracking powered by Gmail + Claude AI — built for people in LATAM where bank APIs don't exist.

---

## The Problem

If you live in Latin America, you can't connect your bank to any finance app. Banks like BCP, Interbank, BBVA, and Scotiabank don't offer public APIs. Most personal finance tools are built for the US market and just don't work here.

But every bank *does* send you an email notification every time you spend money.

That's the workaround.

---

## How It Works

This app reads those notification emails from your Gmail, uses Claude AI to extract the transaction details, and shows them in a clean dashboard with spending charts, categories, and budget alerts — automatically, every time you make a purchase.

You don't enter anything manually. You just spend money, the bank emails you, and the dashboard updates.

```
Bank charges your card
        ↓
Bank sends notification email to your Gmail
        ↓
App fetches email via Gmail API (read-only)
        ↓
Claude AI extracts: amount, currency, category, merchant
        ↓
Transaction saved to your personal dashboard
        ↓
Spending charts and budget alerts update in real time
```

---

## Why Claude AI?

Bank notification emails are inconsistent. Each bank has its own format, each one uses different HTML layouts, some are in Spanish, some mix PEN and USD, some show the merchant name buried in a footer. Writing regex rules for all of this would be a nightmare that breaks every time a bank updates their email template.

Claude reads the raw email HTML and returns structured JSON — amount, currency, category, description — regardless of the format. It just works, even for edge cases. Cost is roughly $0.01–0.02 per sync for a typical user.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python + FastAPI + SQLAlchemy |
| Database | PostgreSQL via Supabase |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Auth | Google OAuth2 + JWT |
| AI | Anthropic Claude API |
| Email | Gmail API (read-only scope) |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## Features

- **Google OAuth login** — sign in with the Google account connected to your bank emails
- **Auto-sync** — pulls bank notification emails and runs them through Claude
- **Multi-bank support** — BCP, Interbank, BBVA, Scotiabank (Peru), easily extensible
- **PEN / USD toggle** — handles both currencies with configurable exchange rate
- **Spending by category** — groceries, transport, restaurants, utilities, and more
- **Monthly trend charts** — see how your spending evolves month to month
- **Budget alerts** — set limits per category and get notified when you're close
- **Manual entry** — add transactions that didn't come from an email
- **Multi-user** — each user authenticates independently and sees only their own data

---

## Who It's For

Built primarily for users in **Peru and LATAM** where traditional bank integrations aren't available. Tested with around 100 users (current Google OAuth limit while in testing mode) and the feedback has been consistently that it solves a real gap — people who want to track their finances but have no good tool that actually works with their local banks.

It's also a practical example of using AI not as a gimmick, but as the actual solution to a data extraction problem that would be very painful to solve any other way.

---

## Architecture

```
[User Browser]
       │
       ├── Frontend: Vercel
       │   React SPA — dashboard, charts, budget management
       │
       ├── Backend: Railway
       │   FastAPI — OAuth flow, Gmail sync, Claude integration, REST API
       │
       └── Database: Supabase (PostgreSQL)
           One row per user, isolated transaction and budget data
```

### Auth Flow (cross-domain JWT)

Because the frontend (Vercel) and backend (Railway) are on different domains, cookies don't work. Auth uses JWT tokens passed via URL query param after OAuth:

```
1. User clicks "Continue with Google"
2. Backend redirects to Google OAuth consent
3. Google redirects back to backend /auth/callback
4. Backend creates JWT, redirects to frontend /login?token=JWT
5. Frontend stores token in localStorage
6. All API calls send Authorization: Bearer <token>
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Cloud project with Gmail API + OAuth enabled
- An Anthropic API key
- A Supabase project (or any PostgreSQL instance)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env (see Environment Variables below)
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Create .env with: VITE_BACKEND_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

### Backend (Railway)

```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BACKEND_URL=https://your-backend.up.railway.app
FRONTEND_URL=https://your-frontend.vercel.app
JWT_SECRET=...
FERNET_KEY=...
ANTHROPIC_API_KEY=...
PEN_TO_USD_RATE=0.27
BANK_SENDERS=alertas@bcp.com.pe,notificaciones@interbank.pe,avisos@bbva.pe,alertas@scotiabank.com.pe
```

### Frontend (Vercel)

```
VITE_BACKEND_URL=https://your-backend.up.railway.app
```

---

## Supported Banks (Peru)

| Bank | Email sender |
|---|---|
| BCP | alertas@bcp.com.pe / notificaciones@notificacionesbcp.com.pe |
| Interbank | notificaciones@interbank.pe |
| BBVA | avisos@bbva.pe |
| Scotiabank | alertas@scotiabank.com.pe |

To add another bank, just add their notification email to `BANK_SENDERS`.

---

## Limitations & Notes

- **Google OAuth testing mode** — currently limited to 100 manually added test users. Submitting for Google verification would remove this cap.
- **Gmail read-only** — the app never reads, sends, or modifies anything. It only scans emails from the configured bank senders.
- **Claude API cost** — roughly $0.01–0.02 per sync per user depending on email volume. Very manageable at small scale.
- **Railway free tier** — $5 credit or 30 days, then ~$5/month.

---

## Project Structure

```
budget-tracker/
├── backend/
│   ├── main.py                  # FastAPI app, routes, lifespan
│   ├── auth.py                  # Google OAuth2, JWT, session management
│   ├── models.py                # User, Transaction, Budget models
│   ├── database.py              # SQLAlchemy engine and session
│   ├── transactions.py          # Transaction CRUD endpoints
│   ├── budgets.py               # Budget CRUD endpoints
│   ├── dashboard.py             # Summary, charts, budget status
│   ├── sync_job.py              # Gmail sync → Claude → DB pipeline
│   ├── fetch_emails.py          # Gmail API email fetching
│   ├── extract_transactions.py  # Claude API email parsing
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api.js               # Axios instance, all API calls
        ├── App.jsx              # Router, nav, auth wrapper
        ├── context/
        │   └── AuthContext.jsx  # Auth state and token management
        └── pages/
            ├── Dashboard.jsx
            ├── Transactions.jsx
            └── Budgets.jsx
```

---

## Contributing

This is a personal project built to solve a real problem. If you're in LATAM and want to add support for your local bank's notification emails, open a PR — the Claude-based extraction is flexible enough to handle new formats without code changes, just add the sender email.

