# Broadmail

> Production-ready mass email platform. Primary use: Enactus KNUST. Designed to be cloned and reused for any organisation. Built in a 2-day sprint with Claude Code.

---

## What is Broadmail?

Broadmail is a self-hosted bulk email platform for sending newsletters, event announcements, and recruitment emails to segmented contact lists. It supports CSV/Excel imports, a rich template editor, campaign scheduling, open/click tracking, and unsubscribe management.

- **Invite-only** — no public registration. Admins create all user accounts.
- **Multi-org ready** — clone the repo, swap env vars, deploy for any organisation.
- **Provider-agnostic** — Resend as primary, any SMTP server as fallback.

---

## Tech Stack

**Backend**: FastAPI · SQLAlchemy 2 (async) · PostgreSQL · Alembic · ARQ (Redis) · Resend / aiosmtplib · Jinja2 · Pydantic v2

**Frontend**: Next.js 14 (App Router) · Tailwind CSS · shadcn/ui · next-auth v5 · TanStack Query · Tiptap · Recharts

**Infrastructure**: Railway or Render (backend) · Vercel (frontend) · Railway Postgres or Supabase · Railway Redis or Upstash

---

## Features

- **Contact management** — import from CSV/XLSX, tag contacts into lists, manage suppression (bounces, unsubscribes)
- **Email templates** — rich text editor (Tiptap) with Jinja2 variable injection and live preview
- **Campaigns** — 3-step wizard, immediate or scheduled send, status tracking
- **Batch sending** — always sends in batches of 50; Resend primary, SMTP fallback
- **Analytics** — open tracking (pixel), click tracking (redirect), per-campaign stats dashboard
- **Webhooks** — Resend event ingestion (bounce, complaint, delivery)
- **Unsubscribe** — one-click, honoured at the worker level, not just the UI

---

## Repository Structure

```
broadmail/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # config, database, security, dependencies, exceptions
│   │   ├── auth/          # login, refresh, logout
│   │   ├── users/         # admin user management
│   │   ├── contacts/      # contacts, lists, CSV/XLSX import
│   │   ├── templates/     # email templates, Jinja2 preview
│   │   ├── campaigns/     # campaign CRUD, status machine, scheduling
│   │   ├── sending/       # Resend + SMTP providers, ARQ worker
│   │   ├── analytics/     # tracking pixel, click redirect, event recording
│   │   └── webhooks/      # Resend event webhook
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (auth)/login/
    │   └── (dashboard)/   # contacts, templates, campaigns, settings
    ├── components/
    ├── hooks/
    ├── lib/               # api.ts, auth.ts, utils.ts
    └── types/
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, RESEND_API_KEY, SECRET_KEY, etc.

alembic upgrade head
python -m app.scripts.create_admin   # seeds the first admin user

uvicorn app.main:app --reload
# ARQ worker (separate terminal):
arq app.sending.worker.WorkerSettings
```

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Edit .env.local with NEXTAUTH_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_API_URL

npm run dev
```

---

## Environment Variables

### Backend `.env`

```env
APP_ENV=production
SECRET_KEY=<64-char random hex>
ALLOWED_ORIGINS=https://your-frontend.vercel.app

DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/broadmail
REDIS_URL=redis://localhost:6379

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourorg@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_USE_TLS=true

TRACKING_BASE_URL=https://your-backend-domain/
UNSUBSCRIBE_SECRET=<separate long random string>

FIRST_ADMIN_EMAIL=admin@enactusknust.com
FIRST_ADMIN_PASSWORD=<temporary strong password>
```

### Frontend `.env.local`

```env
NEXTAUTH_URL=https://your-frontend.vercel.app
NEXTAUTH_SECRET=<long random string>
NEXT_PUBLIC_API_URL=https://your-backend-domain
```

---

## Key Constraints

| Rule | Detail |
|------|--------|
| No self-signup | All users created by Admin only |
| Batch size | Max 50 emails per provider call, always |
| Provider order | Resend first, SMTP fallback — never both simultaneously |
| Suppression | Honoured at the worker level; suppressed contacts can never receive email |
| Secrets | Environment variables only — no hardcoded credentials |

---

## API Overview

```
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me

GET    /api/contacts            POST /api/contacts
POST   /api/contacts/import     (CSV or XLSX upload)

GET    /api/lists               POST /api/lists
GET    /api/lists/{id}/contacts POST /api/lists/{id}/contacts

GET    /api/templates           POST /api/templates
POST   /api/templates/{id}/preview

GET    /api/campaigns           POST /api/campaigns
POST   /api/campaigns/{id}/send
POST   /api/campaigns/{id}/schedule
GET    /api/campaigns/{id}/analytics

GET    /api/analytics/overview

GET    /track/open              (pixel, no auth)
GET    /track/click/{token}     (redirect, no auth)
GET    /unsubscribe/{token}     (no auth)

POST   /webhooks/resend
GET    /health
```

Full route reference in [`CLAUDE.md`](./CLAUDE.md).

---

## Security

- **JWT**: 15-min access tokens, 7-day refresh tokens (rotated, stored hashed)
- **Passwords**: bcrypt cost factor 12
- **Rate limiting**: 5 req/min on login, 100 req/min elsewhere (per IP)
- **CORS**: exact frontend domain only — never `*`
- **Template XSS**: HTML sanitised with `bleach` before storage
- **Webhooks**: Resend signature verified via `svix`
- **Tracking URLs**: HMAC-signed tokens — no plaintext contact IDs in URLs

---

## Deployment

### Railway (recommended)

1. Create a Railway project, add Postgres and Redis services.
2. Deploy backend from `backend/` — set start command:
   ```
   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Add a second Railway service for the ARQ worker:
   ```
   arq app.sending.worker.WorkerSettings
   ```
4. Deploy frontend to Vercel, point `NEXT_PUBLIC_API_URL` at the Railway backend.
5. Register Resend webhook: `https://your-backend/webhooks/resend`
6. Run `python -m app.scripts.create_admin` once, then remove `FIRST_ADMIN_*` env vars.

### Deployment Checklist

- [ ] `SECRET_KEY` is a 64-char random hex string
- [ ] `ALLOWED_ORIGINS` set to exact frontend domain (no trailing slash)
- [ ] Migrations run before app start
- [ ] ARQ worker running as a separate service
- [ ] Resend webhook registered
- [ ] `FIRST_ADMIN_*` env vars removed after first run
- [ ] HTTPS enforced on both services
- [ ] `GET /health` returns `{"status": "ok"}`

---

## Testing

```bash
cd backend
pytest                    # runs full async test suite
pytest tests/test_auth.py # single module
```

Tests use a separate test database and mock the Resend API — no real emails are sent.

---

## Licence

MIT — clone it, fork it, run it for your org.
