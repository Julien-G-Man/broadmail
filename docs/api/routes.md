# API Routes Reference

Base URL: `https://your-backend-domain`

All protected routes require: `Authorization: Bearer <access_token>`

---

## Auth

### `POST /api/auth/login`
Rate limited: **10 requests/minute per IP**.

```json
// Request
{ "email": "user@example.com", "password": "password123" }

// Response 200
{ "access_token": "eyJ...", "token_type": "bearer" }

// Response 401
{ "detail": "Invalid credentials" }
```

Credentials are validated against `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` environment variables only. No database lookup occurs. The issued access token is valid for **7 days**. There are no refresh tokens and no logout endpoint.

### `GET /api/auth/me`
```json
// Response 200
{ "id": null, "email": "admin@example.com", "name": "Admin", "role": "admin", "is_active": true }
```

Returns admin identity constructed from env vars.

---

## Users (Admin only)

### `GET /api/users`
Returns array of `UserRead`.

### `POST /api/users`
```json
// Request
{ "email": "new@example.com", "name": "Bob", "password": "secure123", "role": "sender" }
// Response 201 — UserRead
```
`password` must not exceed 72 bytes (bcrypt truncation limit). Enforced via Pydantic validator.

### `PATCH /api/users/{id}`
```json
// Request (all fields optional)
{ "name": "Bob Updated", "role": "admin", "is_active": true }
// Response 200 — UserRead
```

### `DELETE /api/users/{id}`
Deactivates user (sets `is_active=false`). Response 204.

### `POST /api/users/{id}/reset-password`
```json
// Request
{ "new_password": "newpassword123" }
// Response 204
```
`new_password` must not exceed 72 bytes (bcrypt truncation limit). Enforced via Pydantic validator.

---

## Contacts

### `GET /api/contacts`
Query params: `page` (default 1), `page_size` (default 50), `search` (matches email, first_name, last_name), `list_id`, `suppressed` (bool)
```json
// Response 200
{
  "items": [{ "id": "uuid", "email": "...", "first_name": "...", "is_suppressed": false, ... }],
  "total": 1250,
  "page": 1,
  "page_size": 50
}
```

### `POST /api/contacts`
```json
// Request
{ "email": "contact@example.com", "first_name": "John", "last_name": "Doe", "custom_fields": {} }
// Response 201 — ContactRead
```

### `GET /api/contacts/{id}` → `ContactRead`
### `PATCH /api/contacts/{id}` → `ContactRead`
### `DELETE /api/contacts/{id}` → 204

### `POST /api/contacts/import`
`multipart/form-data`: `file` (CSV or XLSX), optional `list_id` query param.
```json
// Response 200
{ "created": 45, "skipped": 5, "invalid": 2, "total": 52 }

// Response 422 — if email column missing
{ "detail": "No \"email\" column found. Columns in your file: \"name\", \"phone\". Rename the email column to \"email\" and re-upload." }
```
CSV requirements:
- Required column: `email` (case-insensitive — "Email", "EMAIL" all work)
- Optional: `first_name`, `last_name`
- Any other column → stored in `custom_fields` JSONB
- Separator auto-detected (comma, semicolon, tab)
- Encoding: UTF-8 with or without BOM

---

## Lists

### `GET /api/lists` → array of `ListRead` (includes `member_count`)
### `POST /api/lists`
```json
{ "name": "Newsletter Subscribers", "description": "...", "org_tag": "enactus" }
```
### `GET /api/lists/{id}` → `ListRead`
### `PATCH /api/lists/{id}` → `ListRead`
### `DELETE /api/lists/{id}` → 204

### `GET /api/lists/{id}/contacts` → paginated contacts
### `POST /api/lists/{id}/contacts`
```json
{ "contact_ids": ["uuid1", "uuid2"] }
```
### `DELETE /api/lists/{id}/contacts/{contact_id}` → 204

---

## Templates

### `GET /api/templates` → array of `TemplateRead`
### `POST /api/templates`
```json
{
  "name": "Monthly Newsletter",
  "subject": "Hello {{ first_name }}, your update is here",
  "html_body": "<!DOCTYPE html><html>...</html>",
  "text_body": "Dear {{ first_name }},... (optional)",
  "mode": "text"
}
```
`mode`: `"text"` (default) or `"custom"`.
- `"text"` — content is sanitized with bleach (inline styles stripped)
- `"custom"` — HTML stored as-is (inline styles, web images, full HTML allowed)

### `GET /api/templates/{id}` → `TemplateRead`
### `PATCH /api/templates/{id}` → `TemplateRead`
### `DELETE /api/templates/{id}`
```
204 — deleted
409 — template is still referenced by one or more campaigns; delete those first
```

### `POST /api/templates/{id}/preview`
```json
// Request
{ "sample_contact": { "first_name": "John", "last_name": "Doe", "email": "john@test.com" } }

// Response 200
{ "subject": "Hello John, your update is here", "html": "<p>Dear John,</p>...", "text": "..." }
```
Never sends an email. Safe to call freely.

---

## Campaigns

### `GET /api/campaigns` → array of `CampaignRead`
### `POST /api/campaigns`
```json
{
  "name": "Q1 Newsletter",
  "from_name": "Enactus KNUST",
  "from_email": "noreply@enactusknust.com",
  "reply_to": "contact@enactusknust.com",
  "template_id": "uuid",
  "list_ids": ["uuid1", "uuid2"]
}
// Response 201 — CampaignRead (status: "draft")
```

### `PATCH /api/campaigns/{id}` → `CampaignRead` (only if `status == "draft"`)
### `DELETE /api/campaigns/{id}` → 204 (only if `status == "draft" | "failed" | "cancelled"`)

### `POST /api/campaigns/{id}/send`
Prepares recipients, sets status to "queued", enqueues ARQ job.
```json
// Response 200 — CampaignRead (status: "queued")
// Response 400 — if not in correct status
```

### `POST /api/campaigns/{id}/schedule`
```json
// Request
{ "scheduled_at": "2026-04-01T09:00:00Z" }
// Response 200 — CampaignRead (status: "scheduled")
```

### `POST /api/campaigns/{id}/cancel` → `CampaignRead` (only if `scheduled`)

### `GET /api/campaigns/{id}/analytics`
```json
{
  "total_recipients": 500, "sent": 498, "failed": 2, "skipped": 0, "pending": 0,
  "delivered": 490, "opened": 245, "clicked": 82, "bounced": 3, "unsubscribed": 1,
  "open_rate": 0.4919, "click_rate": 0.1647
}
```

### `GET /api/campaigns/{id}/recipients`
Query params: `page`, `page_size`, `status` filter.
Returns paginated `RecipientRead` list.

---

## Analytics & Tracking (No Auth)

### `GET /track/open?c={campaign_id}&r={contact_id}`
Records "opened" event. Returns 1×1 transparent GIF.

### `GET /track/click/{token}`
Decodes JWT token → records "clicked" event → 302 redirect to original URL.

### `GET /unsubscribe/{token}`
Decodes JWT → suppresses contact → returns HTML "You have been unsubscribed" page.

### `GET /api/analytics/overview` (Auth required)
```json
{
  "total_contacts": 1250,
  "total_campaigns": 12,
  "total_sent": 8400,
  "overall_open_rate": 0.42,
  "overall_click_rate": 0.15,
  "recent_campaigns": [...]
}
```

---

## Webhooks

### `POST /webhooks/resend`
Inbound from Resend's webhook system. Verified via `svix` signature. **Returns 503** if `RESEND_WEBHOOK_SECRET` is not configured — the endpoint rejects all requests rather than accepting unverified payloads.

Configure in Resend dashboard: `https://your-backend/webhooks/resend`

Handled events:
- `email.bounced` → suppress contact
- `email.delivery_delayed` → suppress contact
- `email.complained` → suppress contact
- `email.delivered` → record event

---

## Health

### `GET /health`
```json
{ "status": "ok" }
```

### `GET /`
```json
{ "status": "BroadMail API is live. Got to /docs to see API docs." }
```
