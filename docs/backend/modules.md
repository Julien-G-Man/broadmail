# Backend Modules

## `core/`

### `config.py`
Loads all settings from environment variables via `pydantic-settings`. Single `settings` object imported everywhere.

Key settings:
- `SECRET_KEY` — used for JWT signing (access tokens + tracking tokens)
- `UNSUBSCRIBE_SECRET` — separate key for unsubscribe tokens
- `ACCESS_TOKEN_EXPIRE_MINUTES` = 15
- `REFRESH_TOKEN_EXPIRE_DAYS` = 7
- `allowed_origins_list` — parsed from comma-separated `ALLOWED_ORIGINS`

### `database.py`
- Async SQLAlchemy engine with `asyncpg` driver
- `AsyncSessionLocal` session factory
- `Base` — all ORM models inherit from this
- `get_db()` FastAPI dependency — yields a session, commits on success, rolls back on exception

### `security.py`
- `hash_password` / `verify_password` — bcrypt, cost factor 12
- `create_access_token` / `decode_access_token` — 15-min HS256 JWT
- `create_refresh_token` — `secrets.token_urlsafe(64)` (raw random bytes)
- `hash_refresh_token` / `verify_refresh_token` — bcrypt-hashed storage
- `create_tracking_token` / `decode_tracking_token` — short-lived JWT for open/click
- `create_unsubscribe_token` / `decode_unsubscribe_token` — 10-year JWT, separate secret

### `dependencies.py`
FastAPI `Depends` functions:
- `get_current_user` — extracts + validates Bearer JWT, loads User from DB
- `get_current_active_user` — wraps above, checks `is_active`
- `require_admin` — wraps above, checks `role == "admin"`

### `exceptions.py`
Global FastAPI exception handlers registered in `main.py`:
- `http_exception_handler` — JSON `{detail}` responses
- `validation_exception_handler` — logs + returns 422 details
- `generic_exception_handler` — logs + returns 500

---

## `auth/`

### Models
- `User` — `id, email, name, hashed_password, role, is_active, created_at, updated_at, created_by`
- `RefreshToken` — `id, user_id, token_hash, expires_at, revoked, created_at`

### Service
- `authenticate_user` — email lookup + bcrypt verify + active check
- `create_tokens` — issues access JWT + stores hashed refresh token in DB
- `rotate_refresh_token` — iterates non-expired tokens, verifies, revokes old, issues new
- `revoke_token` — marks token revoked (logout)

### Routes
```
POST /api/auth/login      → LoginRequest → TokenResponse
POST /api/auth/refresh    → RefreshRequest → AccessTokenResponse
POST /api/auth/logout     → RefreshRequest → 204
GET  /api/auth/me         → UserRead (requires auth)
```

---

## `users/`

Admin-only user management (no public registration).

### Service
- `create_user` — hashes password, sets `created_by`
- `list_users` / `get_user`
- `update_user` — name, role, is_active
- `deactivate_user` — sets `is_active = False`
- `reset_password` — re-hashes new password

### Routes
```
GET    /api/users
POST   /api/users
PATCH  /api/users/{id}
DELETE /api/users/{id}              (deactivates, not hard delete)
POST   /api/users/{id}/reset-password
```
All require `require_admin`.

---

## `contacts/`

### Models
- `Contact` — `id, email, first_name, last_name, custom_fields (JSONB), is_suppressed, suppression_reason, suppressed_at`
- `ContactList` — `id, name, description, org_tag, created_by`
- `ContactListMembership` — `(contact_id, list_id)` composite PK

### Service
Key functions:
- `import_from_file` — reads CSV/XLSX with pandas, `encoding='utf-8-sig'` (BOM-safe), `dropna(subset=['email'])`, validates email regex, upserts contacts, optionally adds to list
- `upsert_contact` — insert if new email, skip if exists
- `suppress_contact` — sets `is_suppressed=True`, records reason + timestamp
- `add_to_list` / `remove_from_list` — manages membership table

### Routes
```
GET    /api/contacts          (page, search, list_id, suppressed filters)
POST   /api/contacts
GET    /api/contacts/{id}
PATCH  /api/contacts/{id}
DELETE /api/contacts/{id}
POST   /api/contacts/import   (multipart file upload, optional list_id query param)

GET    /api/lists
POST   /api/lists
GET    /api/lists/{id}
PATCH  /api/lists/{id}
DELETE /api/lists/{id}
GET    /api/lists/{id}/contacts
POST   /api/lists/{id}/contacts      (body: {contact_ids: [uuid, ...]})
DELETE /api/lists/{id}/contacts/{contact_id}
```

---

## `templates/`

### Model
`EmailTemplate` — `id, name, subject, html_body, text_body, variables (TEXT[]), created_at, updated_at, created_by`

### Service
- `sanitize_html` — `bleach.clean()` with allowed tags/attrs (prevents XSS in sent emails)
- `extract_variables` — regex `\{\{\s*(\w+)\s*\}\}` on html + subject
- `render_template_with_context` — Jinja2 `autoescape=True`, renders subject + html + text
- `preview_with_sample` — renders with sample contact data, **never sends email**

### Routes
```
GET    /api/templates
POST   /api/templates
GET    /api/templates/{id}
PATCH  /api/templates/{id}
DELETE /api/templates/{id}
POST   /api/templates/{id}/preview   (body: {sample_contact: {...}})
```

---

## `campaigns/`

### Models
- `Campaign` — `id, name, from_name, from_email, reply_to, template_id, list_ids (UUID[]), status, scheduled_at, started_at, completed_at, total_recipients, error_message`
- `CampaignRecipient` — `id, campaign_id, contact_id, email (denormalized), status, provider_id, error, processed_at`

### Status Machine
```
draft → scheduled (via /schedule)
draft → queued    (via /send)
scheduled → cancelled (via /cancel)
scheduled → queued (ARQ scheduler, not yet implemented — see production gap)
queued → sending → sent
any → failed (on error)
```

### Service
- `prepare_recipients` — loads contacts from all target lists, filters suppressed, creates `CampaignRecipient` rows
- `enqueue_campaign` — sets status to "queued", ARQ job pushed to Redis
- `get_campaign_stats` — aggregates recipient statuses + email_events

---

## `sending/`

### `provider.py`
Abstract base: `BaseEmailProvider.send_batch(messages) → list[SendResult]`

### `resend_provider.py`
`ResendProvider` — calls `resend.Emails.send()` per message. Returns `SendResult(success, provider_id, error)`.

### `smtp_provider.py`
`SMTPProvider` — uses `aiosmtplib`, builds `MIMEMultipart("alternative")` with text + html parts, sends per message.

### `dispatcher.py`
`send_batch_with_fallback(messages)`:
1. Try Resend (if `RESEND_API_KEY` set)
2. If Resend raises or all fail → try SMTP (if `SMTP_HOST` set)
3. If neither configured → `RuntimeError`

### `worker.py`
ARQ job `process_campaign(ctx, campaign_id)`:
- Loads campaign + template once before the loop
- Queries all **pending** recipients (idempotent — skips already-sent)
- Iterates in `chunked(recipients, 50)` — never exceeds 50
- Per recipient: checks `is_suppressed`, renders template, injects tracking pixel, wraps links, injects unsubscribe footer
- Calls `send_batch_with_fallback`, marks each recipient sent/failed/skipped
- Sets campaign status to `sent` or `failed`

---

## `analytics/`

### Model
`EmailEvent` — `id, campaign_id, contact_id, event_type, url, ip_address, user_agent, occurred_at, provider_event_id (UNIQUE)`

`provider_event_id` is unique — deduplicates webhook retries.

### Tracking Endpoints (no auth required)
- `GET /track/open?c={campaign_id}&r={contact_id}` — records "opened" event, returns 1×1 transparent GIF
- `GET /track/click/{jwt_token}` — records "clicked" event, 302 redirects to original URL
- `GET /unsubscribe/{jwt_token}` — suppresses contact, records "unsubscribed", returns HTML page

### Protected Endpoints
- `GET /api/analytics/overview` — dashboard stats (total contacts, campaigns, sent, open rate, click rate, recent campaigns)

---

## `webhooks/`

`POST /webhooks/resend` — inbound from Resend:
1. Verifies signature using `svix.webhooks.Webhook(RESEND_WEBHOOK_SECRET)`
2. Routes by event type:
   - `email.bounced` / `email.delivery_delayed` → `handle_bounce` → suppresses contact
   - `email.complained` → `handle_complaint` → suppresses contact
   - `email.delivered` → `handle_delivery` → records event

---

## `scripts/`

`python -m app.scripts.create_admin`
- Reads `FIRST_ADMIN_EMAIL` + `FIRST_ADMIN_PASSWORD` from env
- Creates admin user if not already exists
- Run once after first deploy; then remove env vars
