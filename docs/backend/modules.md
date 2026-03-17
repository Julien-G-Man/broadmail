# Backend Modules

## `core/`

### `config.py`
Loads all settings from environment variables via `pydantic-settings`. Single `settings` object imported everywhere.

Key settings:
- `SECRET_KEY` — used for JWT signing (access tokens + tracking tokens)
- `UNSUBSCRIBE_SECRET` — separate key for unsubscribe tokens
- Access token lifetime is fixed to 7 days in auth router
- `allowed_origins_list` — parsed from comma-separated `ALLOWED_ORIGINS`

### `database.py`
- Async SQLAlchemy engine with `asyncpg` driver for PostgreSQL, `aiosqlite` for local dev
- `_normalise_url()` — strips Neon query-string params, rewrites `postgresql://` → `postgresql+asyncpg://`
- Pool settings (`pool_size`, `max_overflow`, `pool_pre_ping`) are skipped for SQLite automatically
- `AsyncSessionLocal` session factory
- `Base` — all ORM models inherit from this
- `get_db()` FastAPI dependency — yields a session, commits on success, rolls back on exception

### `security.py`
- `hash_password` / `verify_password` — bcrypt 4.x used directly (passlib removed), cost factor 12; enforces 72-byte input limit
- `create_access_token` / `decode_access_token` — 7-day HS256 JWT
- `create_tracking_token` / `decode_tracking_token` — short-lived JWT for open/click
- `create_unsubscribe_token` / `decode_unsubscribe_token` — 10-year JWT, separate secret

### `dependencies.py`
FastAPI `Depends` functions:
- `get_current_user` — decodes the Bearer JWT from the `Authorization` header; verifies that `sub` == `FIRST_ADMIN_EMAIL`; returns an admin `SimpleNamespace(id=None, role="admin", email=FIRST_ADMIN_EMAIL, ...)`
- `get_current_active_user` — delegates to `get_current_user`
- `require_admin` — delegates to `get_current_active_user` (all authenticated users are admin)

`id=None` so that `created_by` writes `NULL` (FK is nullable). Authentication is based entirely on env vars — no database User rows are queried for auth.

### `exceptions.py`
Global FastAPI exception handlers registered in `main.py`:
- `http_exception_handler` — JSON `{detail}` responses
- `validation_exception_handler` — logs + returns 422 details
- `generic_exception_handler` — logs + returns 500

---

## `auth/`

### Models
- `User` — `id, email, name, hashed_password, role, is_active, created_at, updated_at, created_by` (exists in DB but NOT used for authentication)
- `RefreshToken` — `id, user_id, token_hash, expires_at, revoked, created_at` (table exists but is not used — no refresh tokens are issued)

### Router
- `POST /api/auth/login` — compares submitted email + password against `FIRST_ADMIN_EMAIL` + `FIRST_ADMIN_PASSWORD` env vars using `hmac.compare_digest` (timing-safe). On success, issues a 7-day JWT access token. Returns only `access_token` and `token_type`.
- `GET /api/auth/me` — returns admin identity constructed from env vars (requires valid JWT).

No refresh, no logout, no database lookup during authentication.

### Routes
```
POST /api/auth/login      → LoginRequest → { access_token, token_type }
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
- `import_from_file` — reads CSV/XLSX with pandas; `sep=None, engine='python'` auto-detects separators (comma, semicolon, tab); `encoding='utf-8-sig'` (BOM-safe); raises `HTTPException(422)` if no `email` column found (shows what columns were found); upserts contacts, optionally adds to list
- `upsert_contact` — insert if new email, skip if exists
- `suppress_contact` — sets `is_suppressed=True`, records reason + timestamp
- `add_to_list` / `remove_from_list` — manages membership table
- `list_contacts` — supports `search` (ilike on email, first_name, last_name), `list_id` filter, `suppressed` filter, pagination

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
`EmailTemplate` — `id, name, subject, html_body, text_body, variables (TEXT[]), mode, created_at, updated_at, created_by`

`mode` is `"text"` (default) or `"custom"`. Added in migration `0002_template_mode`.

### Service
- `_prepare_html(html, mode)` — for `"text"` mode: sanitizes with `bleach.clean()` (no inline styles); for `"custom"` mode: passes HTML through untouched (user has full control)
- `extract_variables` — regex `\{\{\s*(\w+)\s*\}\}` on html + subject
- `render_template_with_context` — Jinja2 `autoescape=True`, renders subject + html + text
- `preview_with_sample` — renders with sample contact data, **never sends email**

### Routes
```
GET    /api/templates
POST   /api/templates
GET    /api/templates/{id}
PATCH  /api/templates/{id}
DELETE /api/templates/{id}        → 409 if referenced by any campaign
POST   /api/templates/{id}/preview   (body: {sample_contact: {...}})
```

Delete returns `409 Conflict` with a descriptive message if any campaign references this template.

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
scheduled → queued (via ARQ cron dispatcher when scheduled_at <= now)
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
`ResendProvider` — calls `resend.Emails.send()` per message inside `asyncio.to_thread()` to avoid blocking the async event loop. Returns `SendResult(success, provider_id, error)`.

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

ARQ cron `dispatch_scheduled_campaigns(ctx)`:
- Runs every minute
- Selects campaigns where `status == "scheduled"` and `scheduled_at <= now`
- Prepares recipients, sets campaign to `queued`, enqueues `process_campaign`

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
1. **Mandatory** signature verification using `svix.webhooks.Webhook(RESEND_WEBHOOK_SECRET)`. Returns **503** immediately if `RESEND_WEBHOOK_SECRET` is not set in env — never accepts unverified payloads.
2. Routes by event type:
   - `email.bounced` / `email.delivery_delayed` → `handle_bounce` → suppresses contact
   - `email.complained` → `handle_complaint` → suppresses contact
   - `email.delivered` → `handle_delivery` → records event

---

## `scripts/`

No scripts are required. Admin credentials come directly from `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` environment variables — there is no database seeding step and no `create_admin` script to run.
