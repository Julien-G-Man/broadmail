# Database

## Schema

### `users`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           TEXT UNIQUE NOT NULL                -- lowercased on write
name            TEXT NOT NULL
hashed_password TEXT NOT NULL                      -- bcrypt, cost=12
role            TEXT NOT NULL DEFAULT 'sender'     -- 'admin' | 'sender'
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
created_by      UUID REFERENCES users(id)          -- null for first admin
```

### `refresh_tokens`
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

Uses `asyncpg` driver for async SQLAlchemy:

```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/broadmail
```

Pool settings (in `core/database.py`):
- `pool_size=10`
- `max_overflow=20`
- `pool_pre_ping=True` — validates connections before use
