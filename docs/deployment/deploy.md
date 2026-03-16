# Deployment Guide

## Services Required

| Service | Purpose | Recommended |
|---------|---------|-------------|
| Backend hosting | FastAPI app | Railway |
| Frontend hosting | Next.js app | Vercel |
| Database | PostgreSQL 15+ | Railway Postgres |
| Cache/Queue | Redis (ARQ) | Railway Redis or Upstash |
| Email primary | Transactional email | Resend |
| Email fallback | SMTP | Gmail or Zoho |

---

## Backend — Railway

### 1. Create Project

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
```

### 2. Add Services

In the Railway dashboard, add:
- **PostgreSQL** plugin → copy `DATABASE_URL`
- **Redis** plugin → copy `REDIS_URL`

### 3. Environment Variables

Set these in Railway → Settings → Variables:

```env
APP_ENV=production
SECRET_KEY=<64-char hex: python -c "import secrets; print(secrets.token_hex(32))">
ALLOWED_ORIGINS=https://your-app.vercel.app

DATABASE_URL=postgresql+asyncpg://...   (from Railway Postgres)
REDIS_URL=redis://...                    (from Railway Redis)

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

SMTP_HOST=smtp.gmail.com                (optional — fallback only)
SMTP_PORT=587
SMTP_USER=yourorg@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_USE_TLS=true

TRACKING_BASE_URL=https://your-backend.railway.app/
UNSUBSCRIBE_SECRET=<64-char hex: separate from SECRET_KEY>

FIRST_ADMIN_EMAIL=admin@enactusknust.com
FIRST_ADMIN_PASSWORD=<temporary strong password>
```

### 4. Start Command

In Railway → Settings → Deploy:

```
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 5. ARQ Worker

Add a **second service** in Railway (same repo), with start command:

```
python -m arq app.sending.worker.WorkerSettings
```

The worker must share the same env vars (same Redis + DB).

### 6. Seed Admin

After first deploy:
```bash
railway run python -m app.scripts.create_admin
```
Then **remove** `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` from env.

---

## Frontend — Vercel

### 1. Import Repository

- Go to [vercel.com](https://vercel.com) → New Project
- Import the `broadmail` repo
- Set **Root Directory** to `frontend`
- Framework preset: **Next.js**

### 2. Environment Variables

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<64-char hex: separate from backend secrets>
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 3. Deploy

Vercel auto-deploys on push to `main`.

---

## Resend Webhook Setup

1. In [Resend Dashboard](https://resend.com) → Webhooks → Add Endpoint
2. URL: `https://your-backend.railway.app/webhooks/resend`
3. Events to subscribe:
   - `email.bounced`
   - `email.complained`
   - `email.delivered`
   - `email.delivery_delayed`
4. Copy the **Signing Secret** → set as `RESEND_WEBHOOK_SECRET`

---

## Pre-Launch Checklist

### Security
- [ ] `SECRET_KEY` is a 64-char random hex string (not a guessable value)
- [ ] `UNSUBSCRIBE_SECRET` is a separate 64-char random hex string
- [ ] `NEXTAUTH_SECRET` is a separate 64-char random hex string
- [ ] `ALLOWED_ORIGINS` is the exact Vercel URL (no trailing slash, no wildcards)
- [ ] `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` env vars removed after admin seeded
- [ ] HTTPS enforced on both frontend (Vercel auto) and backend (Railway auto)

### Infrastructure
- [ ] Database migrations run before app start (`alembic upgrade head` in start command)
- [ ] ARQ worker running as a separate Railway service
- [ ] Resend webhook URL registered in Resend dashboard
- [ ] `RESEND_WEBHOOK_SECRET` set and matches Resend dashboard signing secret
- [ ] Health check: `GET /health` returns `{"status": "ok"}`

### Functionality
- [ ] Admin user created via `create_admin` script
- [ ] Login works end-to-end
- [ ] Test CSV import with a small file (3–5 rows)
- [ ] Create a template with a variable
- [ ] Create a campaign, link to template + list
- [ ] Send a test campaign to 1 real contact
- [ ] Verify tracking pixel fires (check analytics/overview)
- [ ] Verify unsubscribe link works (click → confirm "unsubscribed" page → check contact.is_suppressed)
- [ ] Test Resend webhook by manually triggering a delivery event

---

## Environment Variable Reference

### Backend `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ENV` | Yes | `production` or `development` |
| `SECRET_KEY` | Yes | 64-char hex, JWT signing |
| `ALLOWED_ORIGINS` | Yes | Frontend URL (comma-separated if multiple) |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` |
| `REDIS_URL` | Yes | `redis://...` |
| `RESEND_API_KEY` | One of | `re_...` from Resend |
| `RESEND_WEBHOOK_SECRET` | One of | `whsec_...` from Resend |
| `SMTP_HOST` | One of | SMTP hostname (fallback) |
| `SMTP_PORT` | No | Default 587 |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `SMTP_USE_TLS` | No | Default `true` |
| `TRACKING_BASE_URL` | Yes | Backend public URL with trailing slash |
| `UNSUBSCRIBE_SECRET` | Yes | Separate 64-char hex |
| `FIRST_ADMIN_EMAIL` | Seed only | Remove after seeding |
| `FIRST_ADMIN_PASSWORD` | Seed only | Remove after seeding |

### Frontend `.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Frontend public URL |
| `NEXTAUTH_SECRET` | Yes | 64-char hex, next-auth signing |
| `NEXT_PUBLIC_API_URL` | Yes | Backend public URL (no trailing slash) |
