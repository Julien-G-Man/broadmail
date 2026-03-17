# Testing

## Running Tests

```bash
cd backend

# Install dev dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov httpx aiosqlite

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_auth.py -v

# Run a specific test
pytest tests/test_auth.py::test_login_success -v
```

---

## Test Setup

Tests use **SQLite in-memory** (via `aiosqlite`) — no real PostgreSQL needed.

`tests/conftest.py` provides:

| Fixture | Scope | Description |
|---------|-------|-------------|
| `event_loop` | session | Shared asyncio event loop |
| `test_engine` | session | In-memory SQLite, creates all tables |
| `db_session` | function | Fresh session per test, rolled back after |
| `client` | function | `httpx.AsyncClient` with DB override and `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` set in env |
| `admin_user` | function | Dict with `email` / `password` matching the test env vars — used to obtain a JWT via `POST /api/auth/login` |

Note: `admin_user` does not create a database row. Auth is env-var based. Tests authenticate by hitting `POST /api/auth/login` with the env credentials and using the returned token for subsequent requests.

The `get_db` dependency is overridden per test to use the test session.

---

## Test Files

### `test_auth.py`
Auth tests hit the login endpoint with env credentials (`FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`). No database users are created. No refresh or logout tests exist — those endpoints do not exist.

| Test | What it verifies |
|------|-----------------|
| `test_login_success` | Returns `access_token` with valid env credentials |
| `test_login_wrong_password` | Returns 401 |
| `test_login_unknown_user` | Returns 401 |
| `test_me` | Returns admin info with valid token |
| `test_me_unauthenticated` | Returns 401/403 without token |

### `test_contacts.py`
| Test | What it verifies |
|------|-----------------|
| `test_create_contact` | Creates contact, returns 201 |
| `test_list_contacts` | Returns paginated response |
| `test_get_contact` | Returns single contact by ID |
| `test_import_csv` | Imports 2 contacts, 0 invalid |
| `test_create_list` | Creates list, returns 201 |
| `test_list_lists` | Returns list array |

### `test_campaigns.py`
| Test | What it verifies |
|------|-----------------|
| `test_create_campaign` | Creates draft campaign |
| `test_list_campaigns` | Returns campaign array |
| `test_campaign_status_transitions` | draft→scheduled→cancelled |

### `test_sending.py`
| Test | What it verifies |
|------|-----------------|
| `test_dispatcher_uses_resend_when_configured` | Uses ResendProvider when API key set |
| `test_dispatcher_falls_back_to_smtp_when_resend_fails` | Falls back to SMTP on exception |
| `test_dispatcher_raises_when_no_provider` | RuntimeError if neither configured |

Sending tests mock the providers — **never call real Resend/SMTP in tests**.

---

## Coverage Targets

Minimum coverage for key paths:

| Module | Priority |
|--------|---------|
| `auth/router.py` | High — env-var credential comparison and token issuance |
| `contacts/service.py:import_from_file` | High — edge cases in CSV parsing |
| `campaigns/service.py` | High — status machine correctness |
| `sending/dispatcher.py` | High — fallback logic |
| `sending/worker.py` | Medium — ARQ job (needs Redis mock for full test) |
| `analytics/router.py` | Low — tracking endpoints (manual test in staging) |

---

## What's Not Tested (Manual or Future)

- **ARQ worker end-to-end** — requires running Redis; test with a real staging environment
- **Resend webhook signature verification** — test by sending a real webhook or using Resend's test tool
- **Tracking pixel / click redirect** — manually verify in a real email client
- **Unsubscribe flow** — manually verify by clicking link in a real email
- **Frontend** — no automated tests; manual E2E testing sufficient for v1
