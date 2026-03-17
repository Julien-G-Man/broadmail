# Production Gaps & Status

Tracked against the original gap list. Items marked ✅ are resolved.

---

## Critical (must fix before go-live)

| # | Item | Status |
|---|------|--------|
| 1 | Click-tracking link wrapping in worker | ✅ Fixed — `wrap_links()` added to `sending/worker.py` |
| 2 | Silent ARQ failure on send | ✅ Fixed — raises HTTP 503 instead of swallowing exception |
| 3 | SMTP TLS inverted logic | ✅ Fixed — `starttls()` called only when `SMTP_USE_TLS=true` |
| 4 | Token refresh in frontend | N/A in dev mode (auth disabled); needed when auth is re-enabled |
| 5 | Scheduled campaign execution (ARQ worker) | Pending — Redis + ARQ worker not deployed yet |

---

## High Priority

| # | Item | Status |
|---|------|--------|
| 6 | Contact detail page (`/contacts/[id]`) | ✅ Built |
| 7 | Template edit page (`/templates/[id]/edit`) | ✅ Built |
| 8 | List detail page (`/contacts/lists/[id]`) | ✅ Built |
| 9 | Campaign recipients tab | Pending |
| 10 | CORS hardening | ✅ Fixed — `ALLOWED_ORIGINS` reads from env, no wildcard in prod |

---

## Infrastructure fixes made during dev setup

These were bugs/omissions discovered during the dev sprint:

### Backend

| Fix | File | Detail |
|-----|------|--------|
| `load_dotenv` not called | `app/core/config.py` | Was `load_dotenv` (no `()`) — never executed |
| `ALLOWED_ORIGINS` assigned as tuple | `app/core/config.py` | Python tuple syntax `= "a", "b"` silently ignored env var |
| All config fields used `os.getenv()` | `app/core/config.py` | Redundant with pydantic-settings; replaced with proper defaults |
| `db: AsyncSession = None` in auth deps | `app/core/dependencies.py` | FastAPI tried to build it as a Pydantic response field — crash on startup |
| Missing `email-validator` package | `requirements.txt` | Required by `pydantic[email]`; added |
| Missing `python-multipart` package | `requirements.txt` | Required for file upload endpoints; added |
| Missing `bleach` package | `requirements.txt` | Used in `templates/service.py`; added |
| Duplicate `jose` entry in requirements | `requirements.txt` | Removed duplicate |
| Overly tight `bcrypt<4.1.0` pin | `requirements.txt` | Relaxed to `>=4.1.0` |
| No PostCSS config | `frontend/postcss.config.mjs` | Without this, Tailwind never ran — all `@apply`/`@tailwind` served raw |
| `SessionProvider` in `providers.tsx` | `frontend/app/providers.tsx` | Required `NEXTAUTH_SECRET`; crashed app with auth disabled — removed |
| `useSession` in settings page | `frontend/app/(dashboard)/settings/page.tsx` | Removed; `isAdmin` hardcoded `true` in dev mode |
| `signIn` in login page | `frontend/app/(auth)/login/page.tsx` | Replaced with redirect to `/` since auth is disabled |
| Neon URL query string crashing asyncpg | `app/core/database.py`, `alembic/env.py` | `?sslmode=require&channel_binding=require` appended to DB name; fixed by stripping full query string and passing `ssl='require'` via `connect_args` |
| `postgresql://` prefix for asyncpg | `app/core/database.py`, `alembic/env.py` | Auto-rewritten to `postgresql+asyncpg://` |
| `run.py` hardcoded port + `reload=True` | `backend/run.py` | Port now reads `PORT` env var (Render compatibility); reload disabled in production |

### Frontend

| Fix | File | Detail |
|-----|------|--------|
| No PostCSS config | `frontend/postcss.config.mjs` | Created — Tailwind was not processing CSS at all |
| `tailwindcss-animate` not installed | `package.json` | Required by `tailwind.config.ts`; installed |
| Middleware still blocking routes | `frontend/middleware.ts` | Cleared matcher — no auth redirects in dev mode |
| `SessionProvider` wrapping app | `frontend/app/providers.tsx` | Removed — required `NEXTAUTH_SECRET` env var even when auth is unused |
| Frontend pointing at wrong API port | `frontend/.env` | Was `localhost:8000`; corrected to `localhost:5000` (matches `run.py`) |

---

## Remaining before production (auth re-enabled)

- [ ] Restore real auth dependencies in `app/core/dependencies.py`
- [ ] Restore `middleware.ts` route protection
- [ ] Add token refresh interceptor in `frontend/lib/api.ts`
- [ ] Set `NEXTAUTH_SECRET` if next-auth is re-introduced, or implement a custom session cookie using the backend JWT directly
- [ ] Deploy Redis + ARQ worker for scheduled sends
- [ ] Campaign recipients tab on campaign detail page
- [ ] Resend webhook signature verification (currently accepts all POSTs)
