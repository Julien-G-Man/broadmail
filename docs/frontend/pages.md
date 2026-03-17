# Frontend Pages & Components

## Route Structure

```
app/
├── (auth)/
│   └── login/page.tsx              Redirects to / immediately (auth disabled in dev)
└── (dashboard)/
    ├── layout.tsx                   No-auth shell: Sidebar + TopBar
    ├── page.tsx                     Dashboard overview
    ├── contacts/
    │   ├── page.tsx                 Contacts table + debounced search + import
    │   ├── [id]/page.tsx            Contact detail + event history
    │   └── lists/
    │       ├── page.tsx             Contact lists
    │       └── [id]/page.tsx        List detail + member table + "Import to this list" button
    ├── templates/
    │   ├── page.tsx                 Template list (row layout)
    │   ├── new/page.tsx             Template builder
    │   └── [id]/edit/page.tsx       Edit existing template
    ├── campaigns/
    │   ├── page.tsx                 Campaigns table (row layout)
    │   ├── new/page.tsx             3-step campaign wizard
    │   └── [id]/page.tsx            Campaign detail + analytics
    └── settings/page.tsx            User management (admin always true in dev)
```

---

## Auth Status (dev mode)

Auth is **disabled**. The middleware has an empty matcher — no redirects happen. The login page redirects straight to `/`. All API calls go without a token; the backend returns a dummy admin user for all protected routes.

When auth is re-enabled:
- Restore `middleware.ts` matcher
- Restore `app/core/dependencies.py` real implementations
- Restore `lib/api.ts` JWT interceptor
- Re-add `SessionProvider` to `providers.tsx` if next-auth is used

---

## Pages

### Login (`/login`)
- **Dev mode**: immediately redirects to `/` via `useEffect`
- **Prod (when auth restored)**: email + password form, `zod` validation, calls backend `/api/auth/login`

### Dashboard (`/`)
- Fetches `GET /api/analytics/overview`
- 4 stat cards: Total Contacts, Total Campaigns, Emails Delivered, Open Rate
- 3-step quick-start cards (Import → Template → Campaign)
- Recent campaigns list with status pills and skeleton loaders

### Contacts (`/contacts`)
- Paginated table, avatar initials, debounced search (350ms) on email + first_name + last_name
- Inline "Add Contact" form (toggle)
- "Import CSV" button opens `ContactImportModal`
- Hover-reveal delete button
- Pagination controls

### Contact Detail (`/contacts/[id]`)
- Contact info card with edit capability
- Email event history table (sent, opened, clicked, bounced)

### Contact Lists (`/contacts/lists`)
- Lists with name, member count, created date
- Inline create form

### List Detail (`/contacts/lists/[id]`)
- List header with member count
- **"Import to this list" button** — opens `ContactImportModal` pre-set to this list
- Paginated member table
- Remove-from-list button per row

### Templates (`/templates`)
- Row layout: avatar initials, name, variable chips, subject preview, date
- Hover-reveal Edit / Delete actions
- Delete shows `409` error message if template is in use by a campaign

### Template Editor (`/templates/new`, `/templates/[id]/edit`)
Two modes selected by tab at the top:

**Text only mode:**
- Plain textarea for email body content
- Supports `{{ first_name }}`, `{{ last_name }}`, `{{ email }}` variables
- Variable chip buttons insert at cursor
- Live iframe preview wraps text in a simple HTML shell

**Custom HTML mode:**
- Dark monospace textarea for raw HTML/CSS
- Full control: inline styles, web images via URL, any HTML
- Live iframe preview updates as you type
- **Fullscreen** button opens preview at full viewport
- Variable chip buttons insert at cursor position
- HTML is stored as-is (not sanitized)

Save → `POST /api/templates` or `PATCH /api/templates/{id}`

### Campaigns (`/campaigns`)
- Row layout: avatar, name, from name, status pill, recipients, date
- Hover-reveal actions: Send (draft only), Analytics (sent only), Delete (draft/failed/cancelled)

### New Campaign (`/campaigns/new`)
- 3-step wizard:
  1. **Details** — name, from name, from email, reply-to, template picker
  2. **Audience** — checkbox list of contact lists with live recipient count
  3. **Review** — summary + "Send Now" (primary) + "Save as Draft" (secondary)

### Campaign Detail (`/campaigns/[id]`)
- Status badge + Send Now / Cancel actions
- Analytics cards: Open Rate, Click Rate, Bounced, Unsubscribed
- Recharts funnel: Sent → Delivered → Opened → Clicked → Bounced

### Settings (`/settings`)
- In dev mode: `isAdmin = true` always
- Users table with role + status badges
- Inline add-user form: name, email, password, role

---

## Components

### `components/layout/Sidebar.tsx`
- 240px white sidebar, `border-r`
- Active nav item: `#f0f1ff` background + 3px brand-colored left bar
- Footer shows "dev mode · no auth" label in dev

### `components/layout/TopBar.tsx`
- 56px white header
- Page title derived from current pathname via `META` map
- Contextual CTA button (New Campaign, New Template, etc.) shown per page

### `components/contacts/ContactImportModal.tsx`
- Dropzone (CSV / XLSX)
- Three list modes: **New list** (type a name, creates it first), **Existing list** (dropdown), **No list**
- Accepts `defaultListId` prop — when set, pre-selects "Existing list" mode with that list
- POSTs file to `/api/contacts/import?list_id=...`
- Shows result: `N added, N already existed, N invalid emails`
- Shows warning toast if total=0 with hint to check the email column

### `components/templates/TemplateEditor.tsx`
- Mode tabs: **Text only** | **Custom HTML**
- Variable chip buttons that insert at cursor (works in both modes)
- Left pane: textarea (plain for text mode, dark monospace for HTML mode)
- Right pane: live `<iframe srcDoc={...}>` preview (updates on every keystroke)
- Fullscreen overlay: full-viewport iframe with close button
- On switch text→custom: pre-populates HTML editor with a basic HTML shell wrapping the text

---

## Hooks

### `useContacts.ts`
- `useContacts(params)` — paginated list with search/filter (search debounced at page level)
- `useContact(id)` — single contact + events
- `useContactEvents(id)` — email event history
- `useCreateContact()` / `useUpdateContact()` / `useDeleteContact()`
- `useContactLists()` / `useList(id)` / `useListContacts(listId, params)`
- `useCreateList()` / `useDeleteList()` / `useRemoveContactFromList()`

### `useTemplates.ts`
- `useTemplates()` / `useTemplate(id)`
- `useCreateTemplate()` / `useUpdateTemplate()` / `useDeleteTemplate()`
- `usePreviewTemplate()` — POST to `/api/templates/{id}/preview`

### `useCampaigns.ts`
- `useCampaigns()` / `useCampaign(id)` / `useCampaignStats(id)`
- `useCreateCampaign()` / `useSendCampaign()` / `useCancelCampaign()` / `useDeleteCampaign()`

---

## Styling

### Tailwind
Custom design tokens defined in `tailwind.config.ts`:

```ts
colors: {
  brand: "#1a1a2e",          // deep navy
  "brand-light": "#252542",
  "brand-accent": "#e94560",
  "surface-2": "#f4f5f7",
  "surface-3": "#ecedf0",
  border: "#e4e5e9",
  "text-primary": "#111118",
  "text-secondary": "#5c5c70",
  "text-muted": "#9898aa",
}
```

Fonts: `DM Sans` (headings/`font-display`), `Inter` (body/`font-sans`), `JetBrains Mono` (code/`font-mono`).

### PostCSS
`frontend/postcss.config.mjs` **must exist**. Without it Next.js does not run Tailwind — `@apply` and `@tailwind` directives are served raw and no styles apply.

### Component classes (`globals.css`)
`.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input`, `.card`, `.badge`, `.badge-dot` — defined with `@apply` in `@layer components`.

---

## API client (`lib/api.ts`)

Plain Axios instance pointing at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000`). No auth interceptors in dev mode.
