# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / User                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                   Frontend  (Vercel)                          │
│   Next.js 14 App Router                                       │
│   ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│   │  Login Page  │  │ Dashboard Pages│  │  API Route      │  │
│   │  /login      │  │  /contacts     │  │  /api/auth/**   │  │
│   │              │  │  /campaigns    │  │  (next-auth)    │  │
│   └──────────────┘  │  /templates    │  └─────────────────┘  │
│                     │  /settings     │                        │
│                     └────────────────┘                        │
└───────────────────────────┬───────────────────────────────────┘
                            │ Axios + JWT Bearer
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                   Backend  (Railway)                          │
│   FastAPI  — uvicorn                                          │
│                                                               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│   │  auth/   │ │ contacts/│ │templates/│ │  campaigns/  │   │
│   │ JWT auth │ │ CSV import│ │ Jinja2   │ │ status FSM   │   │
│   └──────────┘ └──────────┘ └──────────┘ └──────┬───────┘   │
│                                                  │ enqueue   │
│   ┌──────────┐ ┌──────────┐ ┌──────────────┐    ▼           │
│   │analytics/│ │webhooks/ │ │   users/     │  ARQ Job       │
│   │ tracking │ │ Resend ▲ │ │ admin CRUD   │    │           │
│   └──────────┘ └──────────┘ └──────────────┘    │           │
└───────────────────────────────────────────┬──────┼───────────┘
                                            │      │
                    ┌───────────────────────▼──┐   │
                    │   PostgreSQL (Railway)    │   │
                    └───────────────────────────┘   │
                                                    │
                    ┌───────────────────────────┐   │
                    │   Redis (Railway/Upstash)  │◄──┘
                    │   ARQ Worker Process       │
                    └───────────────────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │   Resend API  /  SMTP      │
                    │   (max 50/batch)           │
                    └───────────────────────────┘
```

---

## Request Flow: Sending a Campaign

```
1. User clicks "Send Now" in the UI
   → POST /api/campaigns/{id}/send

2. Backend prepares campaign_recipients rows
   → filters suppressed contacts at the DB level

3. Campaign status set to "queued"
   → ARQ job enqueued to Redis

4. ARQ Worker picks up the job
   → loads all pending recipients (not inside the loop)
   → iterates in batches of 50 (hard limit, never exceeded)

5. For each batch:
   → render Jinja2 template per contact
   → inject tracking pixel (open)
   → replace links with click-tracking redirects
   → inject unsubscribe footer
   → call ResendProvider.send_batch()
      → on failure: fall back to SMTPProvider
   → mark each recipient sent/failed/skipped

6. Campaign status set to "sent"
   → total_recipients updated

7. Resend webhook → POST /webhooks/resend
   → svix signature verified
   → bounce/complaint: contact suppressed + event recorded
   → delivery: event recorded
```

---

## Request Flow: Tracking

```
Open Tracking:
  Email HTML contains: <img src="/track/open?c={campaign_id}&r={contact_id}">
  → GET /track/open  →  records "opened" event  →  returns 1x1 GIF

Click Tracking:
  All links replaced with: /track/click/{jwt_token}
  token encodes: {campaign_id, contact_id, original_url, exp}
  → GET /track/click/{token}  →  records "clicked"  →  302 redirect to original URL

Unsubscribe:
  Footer link: /unsubscribe/{jwt_token}
  token encodes: {contact_id, exp: 10 years}
  → GET /unsubscribe/{token}  →  suppresses contact  →  HTML confirmation page
```

---

## Authentication Flow

```
Login:
  POST /api/auth/login
  → validates email + password against FIRST_ADMIN_EMAIL + FIRST_ADMIN_PASSWORD env vars
     (comparison via hmac.compare_digest — timing-safe)
  → issues a 7-day JWT access token (no refresh token)

GET /api/auth/me:
  → returns admin user info constructed from env vars (not from DB)

Protected endpoints:
  Authorization: Bearer <access_token>
  → decoded by get_current_active_user dependency
  → checks that token subject (sub) == FIRST_ADMIN_EMAIL

No refresh tokens. No logout endpoint. The access token is valid for 7 days.
```

---

## Module Map

```
backend/app/
├── core/           Infrastructure: config, DB session, JWT, Depends
├── auth/           Login, token issuance/rotation, logout
├── users/          Admin CRUD (no self-signup)
├── contacts/       Contact + List CRUD, CSV/XLSX import
├── templates/      Email templates, Jinja2 rendering, sanitization
├── campaigns/      Campaign lifecycle, recipient preparation
├── sending/        Email providers (Resend/SMTP), ARQ worker
├── analytics/      Event recording, tracking endpoints, stats
├── webhooks/       Resend inbound events
└── scripts/        (unused — admin credentials come from env vars)
```

---

## Key Constraints (Hard Rules)

| Rule | Where Enforced |
|------|----------------|
| No self-signup | No public `POST /users` — admin only via `require_admin` |
| Batch size ≤ 50 | `BATCH_SIZE = 50` constant in `sending/worker.py` |
| Provider priority: Resend → SMTP | `dispatcher.py` — Resend tried first, SMTP on exception |
| Suppressed contacts never emailed | Worker checks `contact.is_suppressed` per recipient |
| All secrets via env vars | `core/config.py` — pydantic-settings, no defaults in prod |
| HTML sanitized before storage | `bleach.clean()` in `templates/service.py` |
| Unsubscribe tokens never expire | 10-year JWT exp in `security.py:create_unsubscribe_token` |
