# Production Gaps

These items are **required or strongly recommended** before going live. Grouped by severity.

---

## Critical (Must Fix Before Any Real Emails)

### 1. Scheduled Campaign Execution
**Status:** Schema + status machine are done. The scheduler that fires queued campaigns at `scheduled_at` is **not implemented**.

**What's missing:** An ARQ cron job that polls for campaigns with `status = "scheduled"` and `scheduled_at <= now()` and enqueues them.

**Fix:** Add to `sending/worker.py`:
```python
async def check_scheduled_campaigns(ctx):
    async with AsyncSessionLocal() as db:
        from datetime import datetime, timezone
        result = await db.execute(
            select(Campaign).where(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= datetime.now(timezone.utc),
            )
        )
        for campaign in result.scalars().all():
            await db.execute(
                update(Campaign).where(Campaign.id == campaign.id).values(status="queued")
            )
            await ctx["redis"].enqueue_job("process_campaign", str(campaign.id))
        await db.commit()

class WorkerSettings:
    functions = [process_campaign]
    cron_jobs = [cron(check_scheduled_campaigns, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55})]
```

---

### 2. Rate Limiting
**Status:** `slowapi` is in `requirements.txt` but **not wired up** in `main.py`.

**What's missing:** Rate limiting on auth endpoints and all API routes.

**Fix:** Add to `main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Then decorate routes:
```python
# auth/router.py
@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
```

---

### 3. Click-Tracking Link Wrapping
**Status:** Unsubscribe and tracking pixel injection exist. Link wrapping in `worker.py` is **not implemented** — the `wrap_links` call was referenced but the function doesn't exist.

**What's missing:** A function that rewrites all `href` links in the email HTML with `/track/click/{jwt_token}` redirect URLs.

**Fix:** Add to `sending/worker.py`:
```python
import re
from app.core.security import create_tracking_token

def wrap_links(html: str, campaign_id: str, contact_id: str) -> str:
    def replace_link(match):
        original_url = match.group(1)
        if original_url.startswith("mailto:") or original_url.startswith("#"):
            return match.group(0)
        token = create_tracking_token({
            "campaign_id": campaign_id,
            "contact_id": contact_id,
            "url": original_url,
        }, expire_minutes=60 * 24 * 90)  # 90 days
        redirect_url = f"{settings.TRACKING_BASE_URL}track/click/{token}"
        return f'href="{redirect_url}"'
    return re.sub(r'href="([^"]+)"', replace_link, html)
```
Then call it in the worker batch loop.

---

### 4. Token Refresh in Frontend
**Status:** The frontend stores `accessToken` (15-min JWT) in the next-auth session. When it expires, API calls fail with 401 and the user is **kicked to login**.

**What's missing:** Automatic token refresh using the stored `refreshToken`.

**Fix:** In `lib/auth.ts`, add token refresh logic in the `jwt` callback:
```typescript
async jwt({ token, user }) {
  if (user) { /* initial login */ }

  // Check if access token is expired
  if (Date.now() < (token.accessTokenExpires as number)) {
    return token;
  }

  // Refresh it
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({ refresh_token: token.refreshToken }),
      headers: { "Content-Type": "application/json" },
    });
    const tokens = await response.json();
    return { ...token, accessToken: tokens.access_token, accessTokenExpires: Date.now() + 14 * 60 * 1000 };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
```

---

## High Priority (Before Public Launch)

### 5. Contact Detail Page
**Status:** Listed in the file structure but **not implemented**.

The `/contacts/[id]/page.tsx` page showing a contact's full profile and event history is missing.

**Fix:** Create `frontend/app/(dashboard)/contacts/[id]/page.tsx` that:
- Loads contact via `GET /api/contacts/{id}`
- Shows all fields including `custom_fields`
- Shows event history (query `email_events` for this contact — needs a new backend endpoint: `GET /api/contacts/{id}/events`)

---

### 6. Template Edit Page
**Status:** Template gallery links to `/templates/{id}/edit` but this page is **not implemented**.

**Fix:** Create `frontend/app/(dashboard)/templates/[id]/edit/page.tsx`:
```tsx
"use client";
import { useTemplate, useUpdateTemplate } from "@/hooks/useTemplates";
import TemplateEditor from "@/components/templates/TemplateEditor";

export default function EditTemplatePage({ params }) {
  const { data: template } = useTemplate(params.id);
  const updateTemplate = useUpdateTemplate();

  if (!template) return null;

  return (
    <TemplateEditor
      initial={template}
      onSave={(data) => updateTemplate.mutateAsync({ id: params.id, data })}
    />
  );
}
```

---

### 7. Campaign Recipient Detail / Export
**Status:** The campaign recipients API endpoint exists but the UI to browse per-recipient status is missing.

**Fix:** Add a recipients tab to the campaign detail page that loads `GET /api/campaigns/{id}/recipients` with `status` filter (sent/failed/skipped).

---

### 8. CORS Hardening
**Status:** CORS is configured via `ALLOWED_ORIGINS` env var. In development, if this is not set correctly it will fail silently.

**Action:** Before deploying, verify `ALLOWED_ORIGINS` exactly matches the Vercel URL (no trailing slash, no wildcards).

---

### 9. List Detail Page (`/contacts/lists/[id]`)
**Status:** The lists grid links to `/contacts/lists/{id}` but this page is **not implemented**.

**Fix:** Create the page to show list details and its contacts table (reuse the contacts table component with `list_id` filter).

---

## Medium Priority (Polish & Reliability)

### 10. ARQ Worker Health Monitoring
**Status:** The ARQ worker runs but there's no health check or alerting.

**Fix:** Configure Railway health checks on the worker service. Add a simple log heartbeat or use ARQ's built-in job monitoring.

---

### 11. Input Validation on Email Templates
**Status:** Jinja2 template rendering errors (e.g., undefined variables, syntax errors) are not caught and will cause the entire campaign to fail.

**Fix:** Wrap `render_template_with_context` in try/except and mark the recipient as "failed" with the error message rather than crashing the worker.

---

### 12. Pagination on Campaign Recipients in Worker
**Status:** The worker loads **all** pending recipients into memory at once. For campaigns with 50,000+ recipients, this will cause memory issues.

**Fix:** Change the worker to query recipients in pages of 500, processing one page at a time:
```python
QUERY_PAGE_SIZE = 500
offset = 0
while True:
    recipients = await db.execute(
        select(CampaignRecipient)
        .where(CampaignRecipient.campaign_id == campaign.id, CampaignRecipient.status == "pending")
        .offset(offset).limit(QUERY_PAGE_SIZE)
    )
    batch = recipients.scalars().all()
    if not batch:
        break
    # process batch...
    offset += QUERY_PAGE_SIZE
```

---

### 13. Missing Frontend Pages (Contacts)
Not implemented:
- `/contacts/new` — inline form would suffice, or a modal
- `/contacts/[id]` — contact detail + event history

---

### 14. Structured Logging in Production
**Status:** `structlog` is configured but logs go to stderr. In production, you want JSON logs shipped to a log aggregator.

**Fix:** Ensure Railway log drain is configured, or add a log shipping integration.

---

## Low Priority (Nice to Have)

### 15. Campaign Duplication
Allow cloning an existing campaign as a new draft. Useful for recurring newsletters.

### 16. CSV Export
Export contacts or campaign recipients as CSV from the UI.

### 17. Dark Mode
Design system uses CSS variables — dark mode would require a theme toggle.

### 18. Email Preview in Campaign Wizard
Step 3 (Review) of the campaign wizard should show a preview of the rendered email.

### 19. Resend Domain Verification Check
Before sending, check that the `from_email` domain is verified in Resend.

### 20. Playwright E2E Tests
Add Playwright tests for the critical user flows: login → import contacts → create template → create campaign → send.

---

## Summary Table

| # | Item | Severity | Effort |
|---|------|----------|--------|
| 1 | Scheduled campaign execution | Critical | Small (20 lines) |
| 2 | Rate limiting on auth routes | Critical | Small (10 lines) |
| 3 | Click-tracking link wrapping | Critical | Small (15 lines) |
| 4 | Frontend token refresh | Critical | Medium |
| 5 | Contact detail page | High | Medium |
| 6 | Template edit page | High | Small |
| 7 | Campaign recipients tab | High | Small |
| 8 | CORS hardening | High | Config only |
| 9 | List detail page | High | Small |
| 10 | Worker health monitoring | Medium | Config |
| 11 | Template render error handling | Medium | Small |
| 12 | Worker memory pagination | Medium | Small |
| 13 | Missing frontend pages | Medium | Small |
| 14 | Structured logging | Medium | Config |
| 15–20 | Nice-to-haves | Low | Various |
