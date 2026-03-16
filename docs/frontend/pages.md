# Frontend Pages & Components

## Route Structure

```
app/
├── (auth)/
│   └── login/page.tsx          Public — only unauthenticated page
└── (dashboard)/
    ├── layout.tsx               Auth-protected shell (sidebar + topbar)
    ├── page.tsx                 Dashboard overview
    ├── contacts/
    │   ├── page.tsx             Contacts table
    │   └── lists/page.tsx       Contact lists grid
    ├── templates/
    │   ├── page.tsx             Template gallery
    │   └── new/page.tsx         Template builder
    ├── campaigns/
    │   ├── page.tsx             Campaigns table
    │   ├── new/page.tsx         3-step campaign wizard
    │   └── [id]/page.tsx        Campaign detail + analytics
    └── settings/page.tsx        Admin: user management
```

---

## Pages

### Login (`/login`)
- Form with email + password fields
- `react-hook-form` + `zod` validation
- Calls `next-auth signIn("credentials", ...)`
- Redirects to `/` on success
- Shows toast on invalid credentials

### Dashboard (`/`)
- Fetches `GET /api/analytics/overview`
- 4 stat cards: Total Contacts, Total Campaigns, Emails Sent, Open Rate
- Recent campaigns table with status badges
- Skeleton loaders while loading

### Contacts (`/contacts`)
- Paginated table with search (debounced on input)
- Status badge: Active (green) / Suppressed (red)
- Delete with confirmation
- "Import CSV" button opens `ContactImportModal`
- Pagination controls

### Contact Lists (`/contacts/lists`)
- Grid of list cards showing name, description, member count
- Inline "Create List" form (toggle show/hide)
- Delete with confirmation

### Templates (`/templates`)
- Grid of template cards showing name, subject, variable tags
- Edit / Delete actions per card
- "New Template" → `/templates/new`

### Template Editor (`/templates/new` and `/templates/[id]/edit`)
- Split-pane layout: editor left, live preview right
- `Tiptap` rich text editor with Bold, Italic, H2, Bullet List toolbar
- Variable picker buttons insert `{{ first_name }}` etc. at cursor
- Subject line field supports variables
- Preview panel shows rendered HTML via `POST /api/templates/{id}/preview`
- Save button creates/updates template

### Campaigns (`/campaigns`)
- Table with name, status badge, recipient count, created date
- Per-row actions: Send (draft), View Analytics (sent), Delete (draft/failed/cancelled)

### New Campaign (`/campaigns/new`)
- 3-step wizard with progress indicator:
  1. **Details** — name, from name, from email, reply-to, template picker
  2. **Audience** — checkbox list of contact lists
  3. **Review** — summary before creation
- Creates campaign as draft → navigates to campaign detail

### Campaign Detail (`/campaigns/[id]`)
- Header with status badge + Send Now / Cancel actions
- Meta grid: from, reply-to, total recipients, completed at
- Stats cards: Open Rate, Click Rate, Bounced, Unsubscribed
- Bar chart (Recharts): Sent → Delivered → Opened → Clicked → Bounced funnel

### Settings (`/settings`)
- Admin-only (shows shield icon for non-admins)
- Users table: name, email, role badge, status badge, joined date
- "Add User" form (inline toggle): name, email, password, role selector
- Deactivate button per user (except self)

---

## Components

### `components/layout/Sidebar.tsx`
- 240px fixed left sidebar, `bg-brand` (deep navy)
- Navigation links with active state highlight
- Settings link shown only for `role === "admin"`
- User info + sign out at bottom

### `components/layout/TopBar.tsx`
- 56px header, derives page title from current pathname

### `components/contacts/ContactImportModal.tsx`
- `react-dropzone` with CSV/XLSX accept
- Drag-and-drop zone + file picker fallback
- Shows selected file with size
- POSTs `multipart/form-data` to `/api/contacts/import`
- Reports: `N added, N skipped, N invalid`

### `components/templates/TemplateEditor.tsx`
- Tiptap editor with StarterKit + Link + Placeholder extensions
- Toolbar: Bold, Italic, H2, Bullet List
- Variable insertion at cursor position
- Right panel: live HTML preview via `<iframe>` or content preview

---

## Hooks

### `useContacts.ts`
- `useContacts(params)` — paginated list with search/filter
- `useContact(id)` — single contact
- `useCreateContact()` — mutation
- `useDeleteContact()` — mutation
- `useContactLists()` — all lists
- `useCreateList()` / `useDeleteList()` — mutations

### `useTemplates.ts`
- `useTemplates()` — all templates
- `useTemplate(id)` — single template
- `useCreateTemplate()` / `useUpdateTemplate()` / `useDeleteTemplate()` — mutations
- `usePreviewTemplate()` — mutation (POST to `/preview`)

### `useCampaigns.ts`
- `useCampaigns()` — all campaigns
- `useCampaign(id)` — single campaign
- `useCampaignStats(id)` — analytics
- `useCreateCampaign()` / `useSendCampaign()` / `useCancelCampaign()` / `useDeleteCampaign()` — mutations

---

## Auth (`lib/auth.ts`)

next-auth v5 with `Credentials` provider:
1. Calls `POST /api/auth/login` with email/password
2. Calls `GET /api/auth/me` with returned access token
3. Stores `{ id, email, name, role, accessToken, refreshToken }` in JWT session
4. `callbacks.jwt` — puts accessToken into JWT
5. `callbacks.session` — exposes accessToken + role to client

### `lib/api.ts`
Axios instance:
- `baseURL` = `NEXT_PUBLIC_API_URL`
- Request interceptor: reads session, adds `Authorization: Bearer` header
- Response interceptor: on 401, redirects to `/login`

### `middleware.ts`
Runs on every non-static request:
- Not logged in + not on `/login` → redirect to `/login`
- Logged in + on `/login` → redirect to `/`
- Excludes: `api/`, `_next/`, `track/`, `unsubscribe/`, `webhooks/`
