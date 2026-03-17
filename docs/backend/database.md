# Database

## Schema

### `users`
> **Note**: This table is NOT used for authentication. Login credentials come from `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` environment variables only. The table exists to store users created via the admin user management UI, but the auth system does not query it.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           TEXT UNIQUE NOT NULL                -- lowercased on write
name            TEXT NOT NULL
hashed_password TEXT NOT NULL                      -- bcrypt 4.x (passlib removed), cost=12
role            TEXT NOT NULL DEFAULT 'sender'     -- 'admin' | 'sender'
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
created_by      UUID REFERENCES users(id)          -- null for admin-created resources
```

### `refresh_tokens`
> **Note**: Not currently used — the application does not issue refresh tokens. The access token issued at login is valid for 7 days. This table exists for potential future use.

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
token_hash  TEXT UNIQUE NOT NULL    -- bcrypt hash of the raw token
expires_at  TIMESTAMPTZ NOT NULL
revoked     BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT now()
```

### `contact_lists`
```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
description TEXT
org_tag     TEXT DEFAULT 'enactus'
created_at  TIMESTAMPTZ
created_by  UUID REFERENCES users(id)
```

### `contacts`
```sql
id                 UUID PRIMARY KEY
email              TEXT UNIQUE NOT NULL              -- lowercased on write
first_name         TEXT
last_name          TEXT
custom_fields      JSONB DEFAULT '{}'               -- any extra CSV columns
is_suppressed      BOOLEAN DEFAULT false
suppression_reason TEXT                             -- 'unsubscribed' | 'bounce' | 'complaint'
suppressed_at      TIMESTAMPTZ
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

### `contact_list_members`
```sql
contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE    -- PK
list_id     UUID REFERENCES contact_lists(id) ON DELETE CASCADE  -- PK
added_at    TIMESTAMPTZ DEFAULT now()
```

### `email_templates`
```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
subject     TEXT NOT NULL               -- Jinja2, e.g. "Hello {{ first_name }}"
html_body   TEXT NOT NULL               -- sanitized HTML, Jinja2
text_body   TEXT                        -- plain text fallback
variables   TEXT[]                      -- extracted variable names
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
created_by  UUID REFERENCES users(id)
```

### `campaigns`
```sql
id               UUID PRIMARY KEY
name             TEXT NOT NULL
from_name        TEXT NOT NULL
from_email       TEXT NOT NULL
reply_to         TEXT
template_id      UUID REFERENCES email_templates(id)
list_ids         UUID[]                        -- denormalized target list IDs
status           TEXT DEFAULT 'draft'          -- see status machine
scheduled_at     TIMESTAMPTZ
started_at       TIMESTAMPTZ
completed_at     TIMESTAMPTZ
total_recipients INT DEFAULT 0
error_message    TEXT
created_at       TIMESTAMPTZ
created_by       UUID REFERENCES users(id)
```

### `campaign_recipients`
```sql
id           UUID PRIMARY KEY
campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE
contact_id   UUID REFERENCES contacts(id)
email        TEXT NOT NULL               -- denormalized for audit trail
status       TEXT DEFAULT 'pending'      -- pending | sent | failed | skipped
provider_id  TEXT                        -- Resend message ID
error        TEXT
processed_at TIMESTAMPTZ
```

### `email_events`
```sql
id                UUID PRIMARY KEY
campaign_id       UUID REFERENCES campaigns(id)
contact_id        UUID REFERENCES contacts(id)
event_type        TEXT NOT NULL               -- sent | delivered | opened | clicked | bounced | unsubscribed | complained
url               TEXT                        -- for click events
ip_address        TEXT
user_agent        TEXT
occurred_at       TIMESTAMPTZ DEFAULT now()
provider_event_id TEXT UNIQUE                 -- deduplicates webhook retries
```

---

## Migrations

Alembic is configured with async support.

```bash
# Apply migrations
alembic upgrade head

# Create a new migration (after model changes)
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1
```

Migration files live in `backend/alembic/versions/`.

Current migrations:
- `0001_initial_schema.py` — creates all 8 tables

---

## Connection

Uses `asyncpg` driver via async SQLAlchemy. The app supports two backends:

**Production (Neon / any Postgres):**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&channel_binding=require
```
Paste the Neon URL as-is. `app/core/database.py` normalises it automatically:
- Rewrites `postgresql://` → `postgresql+asyncpg://`
- Strips all query-string params (asyncpg rejects them in the URL)
- Passes `ssl='require'` as a `connect_arg` when `sslmode=require` is detected

**Local development (SQLite):**
```
DATABASE_URL=sqlite+aiosqlite:///./broadmail.db
```
Pool settings (`pool_size`, `max_overflow`, `pool_pre_ping`) are skipped for SQLite automatically.

**Postgres pool settings** (applied only for Postgres):
- `pool_size=10`
- `max_overflow=20`
- `pool_pre_ping=True` — validates connections before use

**Local table creation** (dev only, no Alembic needed):
```bash
mailenv\Scripts\python create_tables.py
```
Or use Alembic normally: `alembic upgrade head`
