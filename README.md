# Budget Tracker

Automated budget tracker that reads bank notification emails via Gmail API, extracts transactions with Claude, and displays a live dashboard.

## Architecture

```
Gmail API → fetch_emails.py → Claude API → SQLite → FastAPI → React Dashboard
                                           APScheduler (every 6 hours)
```

## Quick Start

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable **Gmail API**
3. Create OAuth 2.0 credentials → **Desktop App** → Download as `credentials.json`
4. Place `credentials.json` in the `backend/` folder

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
```

First run (triggers Gmail OAuth browser flow):
```bash
uvicorn main:app --reload --port 8000
```

The browser will open for Gmail OAuth on first startup. Token saved to `token.json`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `GMAIL_CREDENTIALS_PATH` | Path to `credentials.json` (default: `credentials.json`) |
| `GMAIL_TOKEN_PATH` | Path to save OAuth token (default: `token.json`) |
| `BANK_SENDERS` | Comma-separated list of bank email addresses |

## Bank Senders (Peru)

Default senders configured:
- BCP: `alertas@bcp.com.pe`
- Interbank: `notificaciones@interbank.pe`
- BBVA: `avisos@bbva.pe`
- Scotiabank: `alertas@scotiabank.com.pe`

Add your bank's notification email to `BANK_SENDERS` in `.env`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check + last sync time |
| POST | `/api/sync` | Trigger manual sync |
| GET | `/api/transactions` | List transactions (filters: month, year, category, bank) |
| PUT | `/api/transactions/{id}` | Edit transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/budgets` | List budget limits |
| POST | `/api/budgets` | Create budget limit |
| PUT | `/api/budgets/{id}` | Update budget limit |
| DELETE | `/api/budgets/{id}` | Delete budget limit |
| GET | `/api/dashboard/summary` | Income/expense summary |
| GET | `/api/dashboard/by-category` | Spending by category |
| GET | `/api/dashboard/monthly-trend` | Monthly spending trend |
| GET | `/api/dashboard/budget-status` | Budget vs actual per category |

## Categories

`groceries` · `transport` · `restaurants` · `entertainment` · `utilities` · `transfer` · `salary` · `shopping` · `health` · `education` · `other`
