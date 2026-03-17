# Production Gaps & Status

Tracked against the original gap list. Items marked ✅ are resolved.

---

## Critical (must fix before go-live)

| # | Item | Status |
|---|------|--------|
| 1 | Click-tracking link wrapping in worker | ✅ Fixed — `wrap_links()` added to `sending/worker.py` |
| 2 | Silent ARQ failure on send | ✅ Fixed — raises HTTP 503 instead of swallowing exception |
| 3 | SMTP TLS inverted logic | ✅ Fixed — `starttls()` called only when `SMTP_USE_TLS=true` |
| 4 | CORS OPTIONS preflight returning 400 | ✅ Fixed — middleware order corrected; CORS runs before SlowAPI |
| 5 | Token refresh in frontend | N/A — no refresh tokens exist. Access token is 7 days; no interceptor needed. |
| 6 | Scheduled campaign execution (ARQ worker) | Pending — Redis + ARQ worker not deployed yet |

---

## High Priority

| # | Item | Status |
|---|------|--------|
| 7 | Contact detail page (`/contacts/[id]`) | ✅ Built |
| 8 | Template edit page (`/templates/[id]/edit`) | ✅ Built |
| 9 | List detail page (`/contacts/lists/[id]`) | ✅ Built |
| 10 | Campaign recipients tab | Pending |
| 11 | CORS hardening | ✅ Fixed — `ALLOWED_ORIGINS` reads from env, no wildcard in prod |

---

## Infrastructure fixes made during dev setup

### Backend

| Fix | File | Detail |
|-----|------|--------|
| `load_dotenv` not called | `app/core/config.py` | Was `load_dotenv` (no `()`) — never executed |
| `ALLOWED_ORIGINS` assigned as tuple | `app/core/config.py` | Python tuple syntax `= "a", "b"` silently ignored env var |
| All config fields used `os.getenv()` | `app/core/config.py` | Redundant with pydantic-settings; replaced with proper defaults |
| `db: AsyncSession = None` in auth deps | `app/core/dependencies.py` | FastAPI tried to build it as a Pydantic response field — crash on startup |
| Dummy user ID caused FK violations | `app/core/dependencies.py` | UUID `00000000-...` didn't exist in `users` table; changed to `id=None` so `created_by` writes NULL |
| Missing `email-validator` package | `requirements.txt` | Required by `pydantic[email]`; added |
| Missing `python-multipart` package | `requirements.txt` | Required for file upload endpoints; added |
| Missing `bleach` package | `requirements.txt` | Used in `templates/service.py`; added |
| Duplicate `jose` entry in requirements | `requirements.txt` | Removed duplicate |
| Overly tight `bcrypt<4.1.0` pin | `requirements.txt` | Relaxed to `>=4.1.0` |
| Neon URL query string crashing asyncpg | `app/core/database.py`, `alembic/env.py` | `?sslmode=require&channel_binding=require` appended to DB name; fixed by stripping full query string and passing `ssl='require'` via `connect_args` |
| `postgresql://` prefix for asyncpg | `app/core/database.py`, `alembic/env.py` | Auto-rewritten to `postgresql+asyncpg://` |
| `run.py` hardcoded port + `reload=True` | `backend/run.py` | Port now reads `PORT` env var (Render compatibility); reload disabled in production |
| SlowAPI middleware ran before CORS | `app/main.py` | SlowAPI intercepted OPTIONS preflights before CORS could handle them — returning 400. Fixed by reversing `add_middleware` order |
| Template delete FK violation | `app/templates/router.py` | Attempting to delete a template referenced by a campaign crashed with 500. Now returns 409 with a clear message |
| CSV import `sep` auto-detection | `app/contacts/service.py` | Added `sep=None, engine='python'` to handle semicolons, tabs, and other separators |
| CSV import `assert` for missing column | `app/contacts/service.py` | Replaced bare `assert` with `HTTPException(422)` that shows what column names were found |
| bleach CSS warning on custom templates | `app/templates/service.py` | Custom HTML mode bypasses bleach entirely; sanitization only applies to text-mode templates |

### Frontend

| Fix | File | Detail |
|-----|------|--------|
| No PostCSS config | `frontend/postcss.config.mjs` | Created — Tailwind was not processing CSS at all |
| `tailwindcss-animate` not installed | `package.json` | Required by `tailwind.config.ts`; installed |
| Middleware protects `/dashboard/:path*` | `frontend/middleware.ts` | Active in dev and prod — redirects unauthenticated users to `/login` |
| `SessionProvider` wrapping app | `frontend/app/providers.tsx` | Removed — next-auth v5 does not require a client-side `SessionProvider` |
| Frontend pointing at wrong API port | `frontend/.env` | Was `localhost:8000`; corrected to `localhost:5000` (matches `run.py`) |
| Import modal "0 added" toast | `components/contacts/ContactImportModal.tsx` | Toast now shows warning with hint when all counts are zero |
| Contact search firing on every keystroke | `app/(dashboard)/contacts/page.tsx` | Added 350ms debounce |

---

## Remaining before production

- [ ] Deploy Redis + ARQ worker for scheduled sends
- [ ] Campaign recipients tab on campaign detail page

**Auth note**: Authentication is active in both dev and production. Login is env-var based (`FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`). No database user table is used for auth. Frontend uses next-auth v5 with `AUTH_SECRET` / `AUTH_URL` env vars. No token refresh is needed — access tokens last 7 days. Resend webhook signature verification is mandatory and enforced (503 if secret not set).
