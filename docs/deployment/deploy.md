# Deployment Guide

## Services Required

| Service | Purpose | Provider |
|---------|---------|----------|
| Backend API | FastAPI app + Alembic migrations | Render (Web Service) |
| Database | PostgreSQL 17 | Neon DB |
| Frontend | Next.js app | Vercel |
| Email (primary) | Transactional email | Resend |
| Email (fallback) | SMTP | Gmail / Zoho |

> Redis + ARQ worker are required for campaign sending and scheduling. Without them, send requests will return 503.

---

## Backend — Render

### Build Command
```
pip install -r requirements.txt && alembic upgrade head
```

### Start Command
```
python run.py
```

Render injects a `PORT` env var automatically. `run.py` reads it:
```python
port = int(os.environ.get("PORT", 5000))
```
Do not hardcode or set a `PORT` env var yourself.

### Environment Variables (Render dashboard)

```env
APP_ENV=production
SECRET_KEY=<64-char random hex — openssl rand -hex 32>
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Neon DB — paste the connection string exactly as Neon gives it.
# The app auto-strips ?sslmode=require&channel_binding=require and
# passes ssl='require' to asyncpg correctly. No manual editing needed.
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_USE_TLS=true

TRACKING_BASE_URL=https://your-backend.onrender.com/
UNSUBSCRIBE_SECRET=<separate long random string>

FIRST_ADMIN_EMAIL=admin@yourorg.com
FIRST_ADMIN_PASSWORD=<strong password>
```

> `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` are the **live login credentials**. They must remain in env permanently — removing them will lock you out of the application. There is no database admin account; these env vars are the only way to authenticate.

### Neon DB URL handling

Neon's connection strings contain query parameters (`?sslmode=require&channel_binding=require`) that asyncpg cannot accept in the URL. The app handles this automatically in `app/core/database.py` and `alembic/env.py`:

1. Rewrites `postgresql://` → `postgresql+asyncpg://`
2. Strips the entire query string from the URL using `urllib.parse`
3. Passes `ssl='require'` as a `connect_arg` to asyncpg

**Paste the Neon URL as-is. Do not edit it.**

---

## Frontend — Vercel

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
AUTH_SECRET=<long random string — openssl rand -hex 32>
AUTH_URL=https://your-frontend.vercel.app
```

`AUTH_SECRET` and `AUTH_URL` are required by next-auth v5. Note: these are named `AUTH_SECRET` / `AUTH_URL`, not `NEXTAUTH_SECRET` / `NEXTAUTH_URL`.

### Build Settings (Vercel dashboard)

- **Root directory**: `frontend`
- **Build command**: `npm run build` (default)
- **Output directory**: `.next` (default)

---

## Resend Webhook

1. Go to Resend dashboard → Webhooks → Add endpoint
2. URL: `https://your-backend.onrender.com/webhooks/resend`
3. Events: `email.delivered`, `email.bounced`, `email.complained`
4. Copy the signing secret → set as `RESEND_WEBHOOK_SECRET`

---

## CORS

`ALLOWED_ORIGINS` must be a comma-separated list of exact frontend origins. No trailing slashes, no wildcards in production.

```
ALLOWED_ORIGINS=https://broadmail.vercel.app
```

---

## Pre-launch Checklist

- [ ] `SECRET_KEY` is a 64-char random hex string
- [ ] `UNSUBSCRIBE_SECRET` is set (different from `SECRET_KEY`)
- [ ] `ALLOWED_ORIGINS` matches exact frontend domain (no trailing slash)
- [ ] Neon DB migrations ran cleanly — check `alembic upgrade head` in build logs
- [ ] Resend webhook URL registered and signing secret matches env var
- [ ] `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` set to production credentials (never remove these)
- [ ] `APP_ENV=production` set (disables `/docs`, `/redoc`, SQLAlchemy echo, uvicorn reload)
- [ ] HTTPS on both frontend and backend (automatic on Vercel/Render)
- [ ] Health check: `GET https://your-backend.onrender.com/health` → `{"status":"ok"}`

---

## Local Development

### Backend
```bash
cd backend
mailenv\Scripts\activate       # Windows
source mailenv/bin/activate    # Mac/Linux

python run.py
# http://localhost:5000 with auto-reload
```

Local `.env` (SQLite, no Redis needed):
```env
APP_ENV=development
SECRET_KEY=dev-secret-key
DATABASE_URL=sqlite+aiosqlite:///./broadmail.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
SMTP_USER=your@gmail.com
SMTP_PASSWORD=app-specific-password
TRACKING_BASE_URL=http://localhost:5000/
UNSUBSCRIBE_SECRET=dev-unsubscribe-secret
REDIS_URL=redis://localhost:6379
```

Create tables on first run (no Alembic needed for SQLite dev):
```bash
mailenv\Scripts\python create_tables.py
```

Or run migrations normally:
```bash
alembic upgrade head
```

### Frontend
```bash
cd frontend
npm run dev
# http://localhost:3000 (or next available port if busy)
```

Local `frontend/.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### PostCSS / Tailwind

A `postcss.config.mjs` is required at `frontend/` root for Tailwind to compile. Without it, `@tailwind` and `@apply` directives are served raw and no styles apply. The file is committed — do not delete it.

### Auth in dev

Set `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` in your local `.env`. The login flow is the same in dev and production — credentials are always read from env vars. The frontend middleware protects `/dashboard/:path*` and redirects unauthenticated users to `/login`.
