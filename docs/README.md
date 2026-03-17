# Broadmail Documentation

Production-ready mass email platform for Enactus KNUST. 
Designed to be improved for use by multiple organisations.

---

## Documentation Index

| Section | Contents |
|---------|----------|
| [Architecture](./architecture/overview.md) | System design, data flow, module map |
| [Backend](./backend/) | FastAPI modules, database, auth, email sending |
| [Frontend](./frontend/) | Next.js pages, components, hooks, auth |
| [API Reference](./api/routes.md) | All endpoints with request/response examples |
| [Deployment](./deployment/deploy.md) | Railway, Vercel, environment variables, checklist |
| [Testing](./testing/testing.md) | Running tests, test strategy, coverage |

---

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env        # fill in secrets — including FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
cp .env.local.example .env.local   # fill in secrets
npm install
npm run dev
```

> Admin credentials are `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` in `.env`. These must remain set permanently — they are the live login credentials, not a one-time seed. No database seeding script is needed.

---

## Tech Stack

**Backend:** FastAPI · SQLAlchemy 2.0 async · PostgreSQL · Alembic · ARQ (Redis) · Resend/SMTP · Jinja2 · pandas

**Frontend:** Next.js 14 App Router · Tailwind CSS · next-auth v5 · TanStack Query · Tiptap · Recharts

**Infrastructure:** Railway (backend + DB + Redis) · Vercel (frontend) · Resend (email)
