# CLAUDE.md — BroadMail

> Production-ready mass email platform. Primary use: Enactus KNUST. Designed to be cloned and reused for any organisation. Built in a 2-day sprint with Claude Code.

-----

## Project Identity

- **Product name**: Broadmail
- **Primary org**: Enactus KNUST
- **Goal**: Send bulk emails (newsletters, event announcements, recruitment) to segmented contact lists imported from CSV/Excel files
- **Reusability**: Multi-org capable — clone repo, swap env vars, deploy
- **Timeline**: 2 days to full production deployment

-----

## Absolute Constraints (never violate these)

1. **No self-signup** — users are created only by an Admin. There is no public registration endpoint.
1. **Batch size = 50** — never send more than 50 emails in a single provider call. Always paginate.
1. **Provider priority**: Resend first → SMTP fallback. Never call both simultaneously.
1. **All secrets via environment variables** — no hardcoded credentials anywhere.
1. **Every DB write is validated with Pydantic** before hitting the ORM.
1. **Frontend is invite/login only** — unauthenticated users see only the login page.
1. **Unsubscribe must be honoured** — suppressed contacts are never re-sent to until manually re-activated by Admin.

-----

## Tech Stack

### Backend

| Concern          | Package                              |
|------------------|--------------------------------------|
| Framework        | FastAPI 0.111+                       |
| ORM              | SQLAlchemy 2.0 (async)               |
| DB               | PostgreSQL 15+                       |
| Migrations       | Alembic                              |
| Validation       | Pydantic v2                          |
| Auth             | python-jose (JWT) + passlib (bcrypt) |
| Task Queue       | ARQ (Redis-backed async queue)       |
| Email — Primary  | resend (official SDK)                |
| Email — Fallback | aiosmtplib                           |
| Template Engine  | Jinja2                               |
| File Parsing     | pandas + openpyxl                    |
| HTTP Client      | httpx                                |
| Rate Limiting    | slowapi                              |
| Env Config       | python-dotenv + pydantic-settings    |
| Logging          | structlog                            |

### Frontend

| Concern          | Package                                 |
|------------------|-----------------------------------------|
| Framework        | Next.js 14 (App Router)                 |
| Styling          | Tailwind CSS                            |
| Components       | shadcn/ui                               |
| Auth             | next-auth v5 (credentials provider)     |
| HTTP Client      | axios + react-query (TanStack Query v5) |
| Rich Text Editor | Tiptap                                  |
| File Upload      | react-dropzone                          |
| Forms            | react-hook-form + zod                   |
| Charts           | Recharts                                |
| Toasts           | sonner                                  |
| Icons            | lucide-react                            |

### Infrastructure

| Concern          | Choice                       |
|------------------|------------------------------|
| Backend hosting  | Render                       |
| Frontend hosting | Vercel                       |
| DB               | Neon DB Postgres             |
| Redis            | Railway Redis or Upstash     |
| Email primary    | Resend                       |
| Email fallback   | Any SMTP (Gmail, Zoho, etc.) |

-----

## Repository Structure

```
broadmail/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory
│   │   ├── core/
│   │   │   ├── config.py              # Settings via pydantic-settings
│   │   │   ├── database.py            # Async SQLAlchemy engine + session
│   │   │   ├── security.py            # JWT creation/verification, password hashing
│   │   │   ├── dependencies.py        # FastAPI Depends: get_db, get_current_user, require_admin
│   │   │   └── exceptions.py          # Global exception handlers
│   │   ├── auth/
│   │   │   ├── models.py              # User, RefreshToken
│   │   │   ├── schemas.py             # LoginRequest, TokenResponse, UserCreate, UserRead
│   │   │   ├── router.py              # POST /auth/login, POST /auth/refresh, POST /auth/logout
│   │   │   └── service.py             # authenticate_user, create_tokens, revoke_token
│   │   ├── users/
│   │   │   ├── models.py              # (re-exports User from auth)
│   │   │   ├── schemas.py             # UserCreate, UserUpdate, UserRead
│   │   │   ├── router.py              # Admin-only CRUD: GET/POST/PATCH/DELETE /users
│   │   │   └── service.py             # create_user (admin), list_users, update_user, deactivate_user
│   │   ├── contacts/
│   │   │   ├── models.py              # Contact, ContactList, ContactListMembership
│   │   │   ├── schemas.py             # ContactCreate, ContactRead, ListCreate, ListRead, ImportResult
│   │   │   ├── router.py              # CRUD for contacts + lists; POST /contacts/import
│   │   │   └── service.py             # import_from_file, add_to_list, remove_from_list, suppress_contact
│   │   ├── templates/
│   │   │   ├── models.py              # EmailTemplate
│   │   │   ├── schemas.py             # TemplateCreate, TemplateRead, TemplatePreview
│   │   │   ├── router.py              # CRUD /templates; POST /templates/{id}/preview
│   │   │   └── service.py             # render_template, extract_variables, preview_with_sample
│   │   ├── campaigns/
│   │   │   ├── models.py              # Campaign, CampaignRecipient
│   │   │   ├── schemas.py             # CampaignCreate, CampaignRead, CampaignStats
│   │   │   ├── router.py              # CRUD /campaigns; POST /campaigns/{id}/send; POST /campaigns/{id}/schedule
│   │   │   └── service.py             # create_campaign, enqueue_campaign, cancel_campaign, get_stats
│   │   ├── sending/
│   │   │   ├── provider.py            # BaseEmailProvider ABC
│   │   │   ├── resend_provider.py     # ResendProvider(BaseEmailProvider)
│   │   │   ├── smtp_provider.py       # SMTPProvider(BaseEmailProvider)
│   │   │   ├── dispatcher.py          # get_provider(), send_batch(), fallback logic
│   │   │   └── worker.py              # ARQ job: process_campaign(campaign_id)
│   │   ├── analytics/
│   │   │   ├── models.py              # EmailEvent (sent, opened, clicked, bounced, unsubscribed)
│   │   │   ├── schemas.py             # EventRead, CampaignAnalytics
│   │   │   ├── router.py              # GET /analytics/campaigns/{id}; GET /track/open; GET /track/click/{token}
│   │   │   └── service.py             # record_event, get_campaign_analytics, resolve_click
│   │   └── webhooks/
│   │       ├── router.py              # POST /webhooks/resend (Resend event ingestion)
│   │       └── service.py             # handle_bounce, handle_complaint, handle_delivery
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/                  # Migration files
│   ├── tests/
│   │   ├── conftest.py                # Async test client, test DB, fixtures
│   │   ├── test_auth.py
│   │   ├── test_contacts.py
│   │   ├── test_campaigns.py
│   │   └── test_sending.py
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx           # Login page — only public page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx             # Sidebar + topbar shell (auth-protected)
    │   │   ├── page.tsx               # Dashboard — stats overview
    │   │   ├── contacts/
    │   │   │   ├── page.tsx           # Contact list table + search
    │   │   │   ├── [id]/page.tsx      # Contact detail + event history
    │   │   │   └── lists/
    │   │   │       ├── page.tsx       # All lists
    │   │   │       └── [id]/page.tsx  # List detail + members
    │   │   ├── templates/
    │   │   │   ├── page.tsx           # Template gallery
    │   │   │   ├── new/page.tsx       # Template builder
    │   │   │   └── [id]/edit/page.tsx # Edit template
    │   │   ├── campaigns/
    │   │   │   ├── page.tsx           # Campaigns table
    │   │   │   ├── new/page.tsx       # Campaign wizard (3 steps)
    │   │   │   └── [id]/page.tsx      # Campaign detail + analytics
    │   │   └── settings/
    │   │       └── page.tsx           # Admin: user management, org settings
    ├── components/
    │   ├── ui/                        # shadcn/ui components
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── contacts/
    │   │   ├── ContactTable.tsx
    │   │   ├── ContactImportDropzone.tsx
    │   │   └── ListSelector.tsx
    │   ├── templates/
    │   │   ├── TemplateEditor.tsx     # Tiptap rich text + variable picker
    │   │   └── TemplatePreview.tsx
    │   ├── campaigns/
    │   │   ├── CampaignWizard.tsx
    │   │   ├── CampaignStatusBadge.tsx
    │   │   └── CampaignAnalyticsChart.tsx
    │   └── shared/
    │       ├── ConfirmDialog.tsx
    │       ├── PageHeader.tsx
    │       └── EmptyState.tsx
    ├── lib/
    │   ├── api.ts                     # Axios instance with JWT interceptors
    │   ├── auth.ts                    # next-auth config
    │   └── utils.ts
    ├── hooks/
    │   ├── useContacts.ts
    │   ├── useTemplates.ts
    │   └── useCampaigns.ts
    ├── types/
    │   └── index.ts                   # Shared TypeScript types
    ├── .env.local.example
    └── next.config.mjs
```

-----

## Database Schema

### `users`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           TEXT UNIQUE NOT NULL
name            TEXT NOT NULL
hashed_password TEXT NOT NULL
role            TEXT NOT NULL DEFAULT 'sender'   -- 'admin' | 'sender'
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
created_by      UUID REFERENCES users(id)        -- who added this user (null for first admin)
```

### `refresh_tokens`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
token_hash  TEXT UNIQUE NOT NULL
expires_at  TIMESTAMPTZ NOT NULL
revoked     BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT now()
```

### `contact_lists`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT NOT NULL
description TEXT
org_tag     TEXT DEFAULT 'enactus'            -- for multi-org use later
created_at  TIMESTAMPTZ DEFAULT now()
created_by  UUID REFERENCES users(id)
```

### `contacts`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid()
email              TEXT UNIQUE NOT NULL
first_name         TEXT
last_name          TEXT
custom_fields      JSONB DEFAULT '{}'             -- flexible extra fields from CSV
is_suppressed      BOOLEAN DEFAULT false          -- unsubscribed or bounced
suppression_reason TEXT                           -- 'unsubscribed' | 'bounce' | 'complaint'
suppressed_at      TIMESTAMPTZ
created_at         TIMESTAMPTZ DEFAULT now()
updated_at         TIMESTAMPTZ DEFAULT now()
```

### `contact_list_members`

```sql
contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE
list_id     UUID REFERENCES contact_lists(id) ON DELETE CASCADE
added_at    TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (contact_id, list_id)
```

### `email_templates`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT NOT NULL
subject     TEXT NOT NULL                    -- supports {{variables}}
html_body   TEXT NOT NULL                    -- Jinja2 template
text_body   TEXT                             -- plain text fallback
variables   TEXT[]                           -- extracted variable names
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
created_by  UUID REFERENCES users(id)
```

### `campaigns`

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
name             TEXT NOT NULL
from_name        TEXT NOT NULL
from_email       TEXT NOT NULL
reply_to         TEXT
template_id      UUID REFERENCES email_templates(id)
list_ids         UUID[]                        -- target lists
status           TEXT DEFAULT 'draft'          -- draft | scheduled | sending | sent | failed | cancelled
scheduled_at     TIMESTAMPTZ                   -- null = send immediately
started_at       TIMESTAMPTZ
completed_at     TIMESTAMPTZ
total_recipients INT DEFAULT 0
error_message    TEXT
created_at       TIMESTAMPTZ DEFAULT now()
created_by       UUID REFERENCES users(id)
```

### `campaign_recipients`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE
contact_id   UUID REFERENCES contacts(id)
email        TEXT NOT NULL                   -- denormalised for audit
status       TEXT DEFAULT 'pending'          -- pending | sent | failed | skipped
provider_id  TEXT                            -- Resend message ID
error        TEXT
processed_at TIMESTAMPTZ
```

### `email_events`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id       UUID REFERENCES campaigns(id)
contact_id        UUID REFERENCES contacts(id)
event_type        TEXT NOT NULL               -- sent | delivered | opened | clicked | bounced | unsubscribed | complained
url               TEXT                        -- for click events
ip_address        TEXT
user_agent        TEXT
occurred_at       TIMESTAMPTZ DEFAULT now()
provider_event_id TEXT UNIQUE                 -- deduplicate webhook events
```

-----

## Core Logic

### Authentication Flow

```
POST /auth/login
  → validate email+password
  → return { access_token (15min JWT), refresh_token (7d, stored hashed in DB) }

POST /auth/refresh
  → validate refresh_token → issue new access_token + rotate refresh_token

POST /auth/logout
  → revoke refresh_token in DB

Every protected endpoint:
  → Authorization: Bearer <access_token>
  → Depends(get_current_active_user)

Admin-only endpoints:
  → Depends(require_admin)
```

First admin is seeded via a management script: `python -m app.scripts.create_admin`

### Email Provider Abstraction

```python
# sending/provider.py
class BaseEmailProvider(ABC):
    @abstractmethod
    async def send_batch(self, messages: list[EmailMessage]) -> list[SendResult]:
        ...

# dispatcher.py
async def get_provider() -> BaseEmailProvider:
    if settings.RESEND_API_KEY:
        return ResendProvider(api_key=settings.RESEND_API_KEY)
    elif settings.SMTP_HOST:
        return SMTPProvider(...)
    else:
        raise RuntimeError("No email provider configured")

async def send_batch_with_fallback(messages: list[EmailMessage]) -> list[SendResult]:
    try:
        provider = ResendProvider(...)
        return await provider.send_batch(messages)
    except ResendError as e:
        logger.warning("Resend failed, falling back to SMTP", error=str(e))
        provider = SMTPProvider(...)
        return await provider.send_batch(messages)
```

### Campaign Sending Worker (ARQ)

```python
# sending/worker.py
async def process_campaign(ctx, campaign_id: str):
    """ARQ job. Pulls pending recipients in batches of 50 and sends."""
    campaign = await get_campaign(campaign_id)
    await set_campaign_status(campaign_id, "sending")

    recipients = await get_pending_recipients(campaign_id)

    for batch in chunked(recipients, 50):  # NEVER exceed 50
        messages = []
        for r in batch:
            contact = await get_contact(r.contact_id)
            if contact.is_suppressed:
                await mark_recipient(r.id, "skipped")
                continue
            rendered = render_template(campaign.template, contact)
            rendered.subject = add_tracking(rendered.subject)
            rendered.html = inject_tracking_pixel(rendered.html, campaign_id, contact.id)
            rendered.html = wrap_links(rendered.html, campaign_id, contact.id)
            rendered.html = inject_unsubscribe_link(rendered.html, contact.id)
            messages.append(rendered)

        results = await send_batch_with_fallback(messages)
        for r, result in zip(batch, results):
            await mark_recipient(r.id, "sent" if result.success else "failed", result.provider_id)

    await set_campaign_status(campaign_id, "sent")
    await update_campaign_stats(campaign_id)
```

### CSV / Excel Import

```python
# contacts/service.py
async def import_from_file(file: UploadFile, list_id: str | None) -> ImportResult:
    """
    Accepts .csv or .xlsx.
    Required column: 'email' (case-insensitive).
    Optional: first_name, last_name, any other column → goes into custom_fields JSONB.
    Validates all emails, skips duplicates, returns summary.
    """
    df = pd.read_csv(file) if file.filename.endswith('.csv') else pd.read_excel(file)
    df.columns = df.columns.str.lower().str.strip()

    assert 'email' in df.columns, "File must have an 'email' column"

    created = skipped = invalid = 0
    for _, row in df.iterrows():
        email = str(row['email']).strip().lower()
        if not is_valid_email(email):
            invalid += 1; continue

        contact_data = {
            'email': email,
            'first_name': row.get('first_name', ''),
            'last_name': row.get('last_name', ''),
            'custom_fields': {k: v for k, v in row.items()
                              if k not in ('email', 'first_name', 'last_name')}
        }

        contact, was_created = await upsert_contact(contact_data)
        if was_created: created += 1
        else: skipped += 1

        if list_id:
            await add_to_list(contact.id, list_id)

    return ImportResult(created=created, skipped=skipped, invalid=invalid)
```

### Template Variable Engine

```python
# templates/service.py
def render_template(template: EmailTemplate, contact: Contact) -> RenderedEmail:
    """
    Variables: {{ first_name }}, {{ last_name }}, {{ email }}, plus any key in contact.custom_fields
    """
    context = {
        'first_name': contact.first_name or '',
        'last_name': contact.last_name or '',
        'email': contact.email,
        **contact.custom_fields
    }
    env = jinja2.Environment(autoescape=True)
    subject = env.from_string(template.subject).render(context)
    html = env.from_string(template.html_body).render(context)
    text = env.from_string(template.text_body or '').render(context)
    return RenderedEmail(subject=subject, html=html, text=text)

def extract_variables(html: str, subject: str) -> list[str]:
    pattern = r'\{\{\s*(\w+)\s*\}\}'
    return list(set(re.findall(pattern, html + subject)))
```

### Tracking

```python
# analytics/router.py

# Open tracking: 1x1 transparent pixel injected into every HTML email
# GET /track/open?c={campaign_id}&r={contact_id}&sig={hmac}
# Returns a 1x1 GIF, records "opened" event

# Click tracking: all href links in HTML replaced with redirect URL
# GET /track/click/{token}
# token = JWT encoding {campaign_id, contact_id, original_url, exp}
# Records "clicked" event, 302 redirects to original URL

# Unsubscribe:
# GET /unsubscribe/{token}
# token = JWT encoding {contact_id, exp: never (long-lived)}
# Suppresses contact, shows "you have been unsubscribed" page
```

-----

## API Routes Reference

### Auth

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

### Users (Admin only)

```
GET    /api/users                     list all users
POST   /api/users                     create user (email, name, role, temp password)
PATCH  /api/users/{id}                update name, role
DELETE /api/users/{id}                deactivate
POST   /api/users/{id}/reset-password
```

### Contacts

```
GET    /api/contacts               paginated list (search, filter by list, filter by suppressed)
POST   /api/contacts               create single contact
GET    /api/contacts/{id}          get contact + event history
PATCH  /api/contacts/{id}          update
DELETE /api/contacts/{id}          hard delete
POST   /api/contacts/import        multipart upload CSV or XLSX
```

### Lists

```
GET    /api/lists
POST   /api/lists
GET    /api/lists/{id}
PATCH  /api/lists/{id}
DELETE /api/lists/{id}
GET    /api/lists/{id}/contacts
POST   /api/lists/{id}/contacts              add contacts (by ID array)
DELETE /api/lists/{id}/contacts/{contact_id}
```

### Templates

```
GET    /api/templates
POST   /api/templates
GET    /api/templates/{id}
PATCH  /api/templates/{id}
DELETE /api/templates/{id}
POST   /api/templates/{id}/preview           { sample_contact: {...} } → rendered HTML
```

### Campaigns

```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/{id}
PATCH  /api/campaigns/{id}                   only if status=draft
DELETE /api/campaigns/{id}                   only if status=draft or failed
POST   /api/campaigns/{id}/send              enqueue immediately
POST   /api/campaigns/{id}/schedule          { scheduled_at: ISO8601 }
POST   /api/campaigns/{id}/cancel            only if status=scheduled
GET    /api/campaigns/{id}/analytics
GET    /api/campaigns/{id}/recipients        paginated, filterable by status
```

### Analytics & Tracking

```
GET    /api/analytics/overview     dashboard stats (total sent, open rate, click rate)
GET    /track/open                 pixel endpoint (no auth)
GET    /track/click/{token}        redirect endpoint (no auth)
GET    /unsubscribe/{token}        unsubscribe endpoint (no auth)
```

### Webhooks

```
POST   /webhooks/resend            Resend event webhook (verified via Resend signature)
```

-----

## Environment Variables

### Backend `.env`

```env
# App
APP_ENV=production
SECRET_KEY=<long random string — used for JWT signing>
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/broadmail

# Redis
REDIS_URL=redis://localhost:6379

# Email — Resend (primary)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Email — SMTP (fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourorg@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_USE_TLS=true

# Tracking
TRACKING_BASE_URL=https://your-backend-domain/
UNSUBSCRIBE_SECRET=<separate long random string>

# Admin seed
FIRST_ADMIN_EMAIL=admin@enactusknust.com
FIRST_ADMIN_PASSWORD=<temporary strong password, change after first login>
```

### Frontend `.env.local`

```env
NEXTAUTH_URL=https://your-frontend-domain.vercel.app
NEXTAUTH_SECRET=<long random string>
NEXT_PUBLIC_API_URL=https://your-backend-domain
```

-----

## Security Requirements

### Backend

- **JWT**: Access token = 15 minutes. Refresh token = 7 days, rotated on every use, stored hashed in DB.
- **Password hashing**: bcrypt with cost factor 12.
- **Rate limiting**: `slowapi` — 5 req/min on `/auth/login`, 100 req/min on all other endpoints per IP.
- **CORS**: Whitelist only the frontend domain. Never use `*` in production.
- **Input sanitisation**: All HTML template content is sanitised with `bleach` before storage to prevent XSS injection into emails.
- **Webhook verification**: Resend webhooks must be verified using `svix` signature verification — reject any webhook without valid signature.
- **Tracking tokens**: Use short-lived HMAC-signed tokens (open/click tracking) and long-lived but contact-specific signed tokens (unsubscribe). Never expose contact IDs in plaintext in URLs.
- **SQL injection**: All DB access through SQLAlchemy ORM — never raw string interpolation.
- **Suppression**: Suppressed contacts are filtered at the worker level, not just the UI. They cannot receive emails even if manually added to a campaign.

### Frontend

- **Route protection**: All `/dashboard/*` routes behind `auth()` middleware in `middleware.ts`.
- **Role-based UI**: Admin-only elements (user management, delete campaign) hidden based on session role — and the corresponding API calls will 403 anyway.
- **No API keys in browser**: All sensitive calls go through the backend. No Resend API key ever reaches the frontend.
- **HTTP-only cookies**: next-auth sessions stored in HTTP-only cookies.

-----

## Design System — Frontend

**Aesthetic direction**: Clean, editorial, utilitarian. Like a well-designed internal tool — confident typography, generous whitespace, functional density only where needed.

**Colour palette (CSS variables)**:

```css
--brand: #1a1a2e          /* deep navy — primary */
--brand-accent: #e94560   /* vivid red — CTAs, status alerts */
--surface: #ffffff
--surface-2: #f8f8f8
--surface-3: #f0f0f0
--border: #e5e5e5
--text-primary: #111111
--text-secondary: #666666
--text-muted: #999999
--success: #16a34a
--warning: #d97706
--error: #dc2626
```

**Typography**:

- Display/headings: `DM Sans` (Google Fonts)
- Body/UI: `Inter`
- Monospace (IDs, code): `JetBrains Mono`

**Layout**:

- Sidebar: 240px fixed, collapsible on mobile
- Content area: max-width 1200px, centred
- Cards with subtle `1px border` and `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`
- Table rows: alternating `surface-2` background on hover, not on default
- Status badges: small pill with coloured dot

**Key UI Patterns**:

- Campaign wizard: 3-step flow with progress indicator at top
- Template editor: split-pane (editor left, live preview right)
- Import: drag-and-drop zone + file picker fallback + field mapping confirmation step
- Empty states: illustrated with a simple SVG + action CTA
- Loading: skeleton loaders, not spinners
- Toasts: top-right, auto-dismiss 4s

-----

## 2-Day Sprint Plan

### Day 1 — Backend Complete

**Morning (0–4h)**

- [ ] Init FastAPI project, install deps, configure `pyproject.toml`
- [ ] `core/config.py` — all settings loaded from env
- [ ] `core/database.py` — async SQLAlchemy engine + session
- [ ] All models defined across all modules
- [ ] `alembic init` + initial migration + `alembic upgrade head`

**Midday (4–8h)**

- [ ] `core/security.py` — bcrypt + JWT
- [ ] `auth/` module complete — login, refresh, logout, me
- [ ] `users/` module complete — admin CRUD, create_admin script
- [ ] Seed first admin via script

**Afternoon (8–12h)**

- [ ] `contacts/` module complete — CRUD + CSV/XLSX import
- [ ] `templates/` module complete — CRUD + Jinja2 preview
- [ ] `campaigns/` module complete — CRUD + status machine

**Evening (12–16h)**

- [ ] `sending/` module — Resend + SMTP providers + dispatcher
- [ ] `sending/worker.py` — ARQ job with batch-of-50 logic
- [ ] `analytics/` module — tracking pixel, click redirect, unsubscribe
- [ ] `webhooks/` module — Resend events handler
- [ ] Full test suite for all modules
- [ ] Dockerfile + Railway/Render config

-----

### Day 2 — Frontend + Integration + Deploy

**Morning (0–4h)**

- [ ] Init Next.js 14 project, install deps, configure Tailwind + shadcn/ui
- [ ] Global layout: Sidebar + TopBar
- [ ] `middleware.ts` — route protection
- [ ] `lib/auth.ts` — next-auth credentials provider wired to backend
- [ ] Login page — complete with form validation

**Midday (4–8h)**

- [ ] Dashboard page — stats cards + recent campaigns list
- [ ] Contacts pages — table, search, import dropzone with field mapping
- [ ] Lists pages — list CRUD, member management

**Afternoon (8–12h)**

- [ ] Templates pages — gallery, Tiptap editor, live preview with variable picker
- [ ] Campaign pages — table, 3-step wizard, status display

**Evening (12–16h)**

- [ ] Campaign analytics page — charts (Recharts), recipient status table
- [ ] Settings page — user management (Admin only)
- [ ] Deploy backend to Railway, frontend to Vercel
- [ ] Wire env vars, run smoke test end-to-end
- [ ] Send first real test campaign to 1 contact ✅

-----

## Common Pitfalls — Avoid These

1. **Never send synchronously in an API route** — always enqueue with ARQ. If Redis is down, return 503.
1. **Never re-query the DB inside a batch loop** — load all recipients before the loop, not inside it.
1. **ARQ job must be idempotent** — if the job is retried (crash mid-batch), it should skip already-sent recipients, not re-send.
1. **Template preview must never send a real email** — render to HTML only.
1. **CSV import must handle BOM, different encodings, and empty rows** — use `pd.read_csv(..., encoding='utf-8-sig')` and `df.dropna(subset=['email'])`.
1. **Unsubscribe tokens must not expire** — use `exp: None` or 10-year expiry. A broken unsubscribe link is a legal liability.
1. **Don't store the raw refresh token** — store `bcrypt_hash(token)` in the DB, compare on verify.
1. **Resend limits**: max 100 emails/request in Resend API. Our batch of 50 is safely within this. Do not increase.
1. **Always set `reply_to`** — set on the campaign level. Never leave it as the sending address by default.
1. **Excel files may have multiple sheets** — always read `sheet_name=0` (first sheet) and inform the user.

-----

## Naming Conventions

- **Python**: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE` for constants
- **SQL**: `snake_case` table and column names
- **TypeScript**: `camelCase` for variables/functions, `PascalCase` for components/types
- **API routes**: `kebab-case`, plural nouns (e.g., `/api/contact-lists`)
- **Env vars**: `UPPER_SNAKE_CASE`
- **Git commits**: `feat:`, `fix:`, `chore:`, `refactor:` prefixes

-----

## Testing Strategy

- **Backend**: pytest-asyncio + httpx `AsyncClient`. Test DB = separate Postgres DB or SQLite for speed.
- Minimum test coverage: auth, contacts import, campaign status transitions, batch sending mock.
- Mock Resend API in tests — never hit the real provider.
- **Frontend**: No unit tests required in 2-day sprint. Manual E2E testing is sufficient. Add Playwright later.

-----

## Deployment Checklist

- [ ] `SECRET_KEY` is a 64-char random hex string (not a guessable value)
- [ ] `ALLOWED_ORIGINS` set to exact frontend domain (no trailing slash)
- [ ] Database migrations run before app start (`alembic upgrade head` in Railway start command)
- [ ] ARQ worker running as a separate process/service
- [ ] Resend webhook URL registered in Resend dashboard → `https://backend-domain/webhooks/resend`
- [ ] `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` env vars set, `create_admin` script run once, then vars removed
- [ ] HTTPS enforced on both frontend and backend (Railway/Vercel do this automatically)
- [ ] Health check endpoint: `GET /health` returns `{"status": "ok"}` (for Railway uptime monitor)

-----

*This file is the source of truth for Claude Code. When in doubt about any implementation detail, refer back here. Every module, schema, and flow described above should be implemented exactly as specified unless a concrete technical reason requires deviation — in which case, document the deviation with a comment.*