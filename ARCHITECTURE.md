# JobFlow — Architecture

Comprehensive technical reference for the job application tracker: system layout, module graph, request flows, data model, state management, and design decisions.

## Contents

1. [Design goals](#1-design-goals)
2. [System overview](#2-system-overview)
3. [Module dependency graph](#3-module-dependency-graph)
4. [Request lifecycles](#4-request-lifecycles)
5. [Frontend component tree](#5-frontend-component-tree)
6. [State ownership model](#6-state-ownership-model)
7. [Data model](#7-data-model)
8. [Stats computation pipeline](#8-stats-computation-pipeline)
9. [Status state machine](#9-status-state-machine)
10. [Styling & design system](#10-styling--design-system)
11. [API surface](#11-api-surface)
12. [Error handling & edge cases](#12-error-handling--edge-cases)
13. [Deployment topology](#13-deployment-topology)
14. [Extension points](#14-extension-points)
15. [Design decisions log](#15-design-decisions-log)

---

## 1. Design goals

| Goal | How it's met |
| --- | --- |
| Zero-config persistence | SQLite file (`jobs.db`) created on first run — no DB server to install |
| Instant feedback | Optimistic status updates on the kanban; server confirms in the background |
| Single-command dev | `npm run dev:all` runs API + frontend together via `concurrently` |
| One source of truth | `STATUSES` + `STATUS_META` define every stage's label/colors for server and UI |
| Typed end-to-end | `Job`/`Status`/`Stats` shapes mirrored between `server/db.ts` and `src/types.ts` |
| No framework lock-in | Plain REST + React — API consumable by any client (CLI, extension, mobile) |
| Small runtime surface | No ORM, no DnD library, no state library — deps are `express`, `better-sqlite3`, `react`, `recharts`, `lucide-react` |

## 2. System overview

```mermaid
flowchart LR
    subgraph Browser["Browser"]
        UI["React SPA<br/>Dashboard · Table · Board"]
    end

    subgraph Dev["Dev machine"]
        direction TB
        V["Vite dev server :5173<br/>HMR + /api proxy"]
        E["Express :3001<br/>REST routes"]
        S[("SQLite jobs.db<br/>WAL mode")]
        V -->|"proxy /api"| E
        E --> S
    end

    UI -->|"fetch /api/*"| V
```

Two processes, one origin: the Vite dev server proxies `/api/*` to Express, so the SPA never deals with CORS or port juggling. `better-sqlite3` is synchronous — every route is a straight-line prepared statement, no connection pooling needed for a single-file DB.

### Runtime vs build-time

```mermaid
flowchart TB
    subgraph Build["Build-time (vite build)"]
        TS[TypeScript sources] -->|tsc -b| TC[Type-check]
        TC --> B[Rolldown bundle]
        B --> DIST["dist/<br/>index.html + hashed assets"]
    end
    subgraph Serve["Runtime (production)"]
        DIST --> ST[Static file server]
        API2[server/index.ts via tsx] --> DB2[(jobs.db)]
        ST -. same origin .-> API2
    end
```

The frontend compiles to a static bundle; the backend ships as plain TS run under `tsx` — no transpile step for the server, keeping dev and prod on identical code.

## 3. Module dependency graph

```mermaid
flowchart TD
    subgraph ServerSide["server/"]
        DBM[db.ts<br/>schema · STATUSES · types]
        IDX[index.ts<br/>routes · validation · seed]
        IDX --> DBM
    end

    subgraph ClientSide["src/"]
        MAIN[main.tsx] --> APP[App.tsx]
        APP --> API[api.ts<br/>fetch client]
        APP --> DASH[Dashboard.tsx]
        APP --> TBL[ApplicationsTable.tsx]
        APP --> KB[KanbanBoard.tsx]
        APP --> FORM[JobForm.tsx]
        APP --> UIX[ui.tsx<br/>StatusBadge · StatCard · date utils]
        DASH --> UIX
        TBL --> UIX
        KB --> UIX
        API --> TYPES[types.ts<br/>Job · Status · Stats · STATUS_META]
        DASH --> TYPES
        TBL --> TYPES
        KB --> TYPES
        FORM --> TYPES
        UIX --> TYPES
    end

    TYPES -. mirrored .-> DBM
    API ==>|"HTTP /api"| IDX
```

Key property: **the dependency graph is a tree, not a web** — every component imports `types.ts`, only `App.tsx` imports `api.ts`, and nothing imports a sibling component. That keeps the render path obvious and prevents circular imports.

## 4. Request lifecycles

### 4a. Page load

```mermaid
sequenceDiagram
    participant B as Browser
    participant V as Vite :5173
    participant A as App.tsx
    participant E as Express :3001
    participant S as SQLite

    B->>V: GET /
    V-->>B: index.html + bundles
    B->>A: mount
    A->>E: GET /api/jobs
    par parallel fetch
        E->>S: SELECT * ORDER BY date DESC
        S-->>E: rows
        E-->>A: Job[]
    and
        A->>E: GET /api/stats
        E->>S: SELECT * (aggregate in JS)
        S-->>E: rows
        E-->>A: Stats
    end
    A->>A: setJobs + setStats
    A-->>B: render active view
```

### 4b. Create application

```mermaid
sequenceDiagram
    actor U as User
    participant F as JobForm
    participant A as App.tsx
    participant E as Express
    participant S as SQLite

    U->>F: Fill fields → submit
    F->>F: validate company + role non-empty
    F->>A: onSave(input)
    A->>E: POST /api/jobs
    E->>E: clean() strings · default status/date
    E->>S: INSERT ... VALUES
    S-->>E: lastInsertRowid
    E->>S: SELECT row WHERE id = new id
    E-->>A: 201 canonical Job
    A->>A: close modal → refresh()
    A->>E: GET /api/jobs + /api/stats
    A-->>U: new row/card appears everywhere
```

### 4c. Kanban drag & drop

```mermaid
sequenceDiagram
    actor U as User
    participant C as JobCard
    participant K as KanbanBoard column
    participant A as App.tsx
    participant E as Express

    U->>C: dragstart
    C->>K: dragId = card id (dim to 0.4)
    U->>K: dragover "Interview" col
    K->>K: overCol = interview (border glow)
    U->>K: drop
    K->>A: onStatusChange(job, "interview")
    A->>A: optimistic setJobs — card jumps now
    A->>E: PATCH /api/jobs/id/status
    alt success
        E-->>A: 200 Job → refresh()
    else failure
        E--xA: error → refresh() reverts card
    end
```

If the PATCH fails, `refresh()` re-fetches server truth and the card animates back — no bespoke rollback logic needed.

## 5. Frontend component tree

```mermaid
flowchart TD
    App["App.tsx — shell & state"]
    App --> NAV["Header<br/>logo · nav pills · Add button"]
    App --> DASH["Dashboard<br/>(view = dashboard)"]
    App --> TBL["ApplicationsTable<br/>(view = table)"]
    App --> KB["KanbanBoard<br/>(view = board)"]
    App --> FORM["JobForm modal"]
    App --> DEL["Delete confirm dialog"]

    DASH --> SC["StatCard ×6"]
    DASH --> RC["recharts<br/>AreaChart · PieChart"]
    DASH --> FUN["Pipeline stage bars"]
    DASH --> FUP["Upcoming follow-ups"]
    DASH --> ACT["RecentActivity"]

    TBL --> CHIPS["FilterChip ×8"]
    TBL --> ROWS["Rows: StatusBadge + inline select + actions"]
    KB --> COL["Column per status"]
    COL --> CARD["Draggable JobCard"]

    App -.->|"jobs, stats, callbacks"| DASH & TBL & KB
    App -.->|"job? · onSave · onClose"| FORM
```

`App.tsx` is the only stateful shell — children are pure views + local UI state (search text, drag target, sort direction). Callbacks flow down: `onEdit`, `onDelete`, `onStatusChange`, `onSave`.

## 6. State ownership model

```mermaid
flowchart LR
    subgraph Server["Server = source of truth"]
        DB[(jobs table)]
    end
    subgraph Client["Client state (App.tsx)"]
        J["jobs: Job[]<br/>server snapshot"]
        S["stats: Stats<br/>server snapshot"]
        V["view: dashboard|table|board"]
        M["modals: editing · confirmDelete"]
    end
    subgraph Local["Per-component local state"]
        L1["Table: q · statusFilter · sortAsc"]
        L2["Board: dragId · overCol"]
        L3["Form: form · busy · error"]
    end
    DB -->|refresh()| J
    DB -->|refresh()| S
    J -->|filter| L1
    J -->|groupBy status| L2
```

- **Server-owned**: every `Job` field — the client never invents values; writes round-trip and re-fetch.
- **App-owned**: view selection, modal targets, the `jobs`/`stats` snapshots — lifted because all three views share them.
- **Component-owned**: ephemeral UI (search text, sort, drag hover) — lives and dies with the view.

This split is why the app needs no Redux/Zustand: shared state is exactly two snapshots refreshed after each mutation.

## 7. Data model

```mermaid
erDiagram
    JOBS {
        int    id            PK
        text   company       "required"
        text   role          "required"
        text   location      "default ''"
        text   url           "default ''"
        text   salary        "default ''"
        text   status        "default 'applied'"
        text   date_applied  "default '' → today on POST"
        text   follow_up     "default ''"
        text   notes         "default ''"
        text   created_at    "DEFAULT datetime('now')"
        text   updated_at    "bumped on every write"
    }
```

Status is a `TEXT` column validated in the route against `STATUSES` — no enum table or joins. Every field except `id`/`company`/`role` is optional, keeping the capture form frictionless.

## 8. Stats computation pipeline

```mermaid
flowchart LR
    R["SELECT * FROM jobs"] --> G["groupBy status<br/>→ byStatus map"]
    R --> W["bucket by ISO week<br/>(last 8) → weekly[]"]
    R --> F["filter follow_up ≤ +7d<br/>∩ active → followUpsDue"]
    G --> D["derived:<br/>applied = total − saved<br/>active = applied+screening+interview<br/>offers = offer+accepted"]
    D --> RR["responseRate =<br/>responded / applied × 100"]
    D & RR & W & F --> OUT[("Stats JSON")]
    OUT --> UI["Dashboard renders:<br/>cards · area chart · donut · bars"]
```

All aggregation runs in JS over one table scan — trivially fast at personal-scale data (<10k rows), and it means stats can never drift out of sync with the data: there are no counters to maintain.

## 9. Status state machine

```mermaid
stateDiagram-v2
    [*] --> saved
    saved --> applied
    applied --> screening
    applied --> rejected
    screening --> interview
    screening --> rejected
    interview --> offer
    interview --> rejected
    offer --> accepted
    offer --> rejected
    accepted --> [*]
    rejected --> [*]
```

The UI doesn't enforce transitions — any card can move anywhere (real job hunts are messy) — but the canonical funnel above is what conversion metrics assume. `saved` is deliberately outside the pipeline: it represents intent, not progress.

## 10. Styling & design system

- **Tailwind CSS v4** via `@tailwindcss/vite` — zero config file; theme tokens (`--color-ink`, `--color-panel`, `--color-edge`, `--color-acc`…) declared once in `index.css` under `@theme`.
- **Component classes**: `.card` (panel surface), `.input`, `.btn` (+`-primary`/`-ghost`/`-danger` variants) — semantic primitives reused by every view.
- **Status visuals are data-driven**: `STATUS_META[status]` supplies `label`, `color`, `bg`, `dot` — badges, kanban headers, donut segments, filter chips all read the same map, so a stage recolor is one line.
- **Drag & drop**: native HTML5 DnD — `draggable` cards, `dragover`/`drop` on columns, `dragId` dims the source and `overCol` glows the target. No library.
- **Charts**: `recharts` `ResponsiveContainer`s sized to parent cards; dark grid strokes read the same theme tokens.

## 11. API surface

| Method | Route | Validation | Returns |
| --- | --- | --- | --- |
| GET | `/api/jobs?status=&q=` | `status` ∈ `STATUSES`; `q` LIKE-matches company/role/location | `Job[]` |
| POST | `/api/jobs` | `company` + `role` required; `status` validated; `date_applied` defaults to today | `201 Job` |
| PUT | `/api/jobs/:id` | merges body over existing row; same rules | `Job` |
| PATCH | `/api/jobs/:id/status` | `status` ∈ `STATUSES` | `Job` |
| DELETE | `/api/jobs/:id` | 404 if absent | `{ok}` |
| GET | `/api/stats` | — | `Stats` aggregate |
| POST | `/api/seed` | only when table is empty (`409` otherwise) | `{inserted}` |

All write endpoints return the canonical row after writing, so the client never guesses about server-side defaults.

## 12. Error handling & edge cases

```mermaid
flowchart TD
    REQ[Request] --> V{Validation}
    V -->|"missing company/role"| E400["400 {error}"]
    V -->|"bad status"| E400
    V -->|"id not found"| E404["404 {error}"]
    V -->|ok| DB[(SQLite write)]
    DB --> R[return updated row]

    subgraph Client["Client side"]
        F1["fetch !ok → throw Error(body.error)"]
        F2["save() catch → show in JobForm"]
        F3["refresh() catch → banner in App"]
        F4["changeStatus catch → refresh()<br/>(reverts optimistic card)"]
    end
```

- **Optimistic-update failure**: kanban moves revert silently via `refresh()` — server truth wins.
- **Seed idempotence**: `POST /api/seed` refuses non-empty tables (`409`), so it can't duplicate.
- **Missing API**: the SPA shows an inline banner (`npm run server` hint) instead of a blank page.
- **Overdue follow-ups**: computed at render time (`follow_up ≤ today` + active status) — no scheduler needed.
- **`updated_at` ordering** powers Recent Activity — bumped by SQL on every UPDATE.

## 13. Deployment topology

### Dev (this project today)

```mermaid
flowchart LR
    B[Browser] -->|":5173"| V[Vite dev<br/>HMR + proxy]
    V -->|"localhost:3001"| E[Express<br/>tsx watch]
    E --> F[(jobs.db)]
```

### Production (suggested)

```mermaid
flowchart LR
    B[Browser] -->|"HTTPS"| P[Reverse proxy<br/>nginx/Caddy]
    P -->|"static /"| FS["dist/ files"]
    P -->|"/api"| E[Express :3001<br/>pm2/systemd]
    E --> F[(jobs.db<br/>or mounted volume)]
```

Same-process-per-origin in both modes: the SPA only ever calls relative `/api/*`, so deployment shape (subpath, domain, or LAN) is purely an ops concern.

## 14. Extension points

- **New pipeline stage**: add to `STATUSES` in `server/db.ts` + `src/types.ts` and a `STATUS_META` entry — table chips, board columns, donut, and form select pick it up automatically.
- **User accounts / multi-user**: add a `user_id` column + auth middleware; the API is already session-agnostic REST.
- **Browser extension capture**: the POST endpoint accepts any payload, so an extension can send `{company, role, url}` scraped from a job board.
- **Reminders**: `follow_up` is already stored — a cron/`setInterval` in `server/index.ts` can push due items to email/Slack.
- **Richer model**: tags, documents (resume versions), or interview rounds fit naturally as extra columns or a second table joined on `job_id`.
- **Bulk import**: CSV/LinkedIn export → loop over `POST /api/jobs`.

## 15. Design decisions log

| Decision | Chosen | Alternative rejected | Why |
| --- | --- | --- | --- |
| DB engine | SQLite via `better-sqlite3` | Postgres / JSON file | Zero-install, sync API keeps routes trivial; JSON loses transactions |
| ORM | None — prepared statements | Prisma / Drizzle | Schema is 1 table; an ORM adds codegen + migration machinery for zero benefit here |
| Server validation | Hand-rolled `clean()` + `STATUSES` check | zod / joi | 9 string fields — a schema lib is heavier than the problem |
| Client state | React state in `App.tsx` + refetch-after-write | React Query / Zustand | Shared state is two snapshots; a library would mainly cache what refetch already gives |
| DnD | Native HTML5 | dnd-kit / react-beautiful-dnd | Kanban needs drag + column drop only; native covers it with no bundle cost |
| UI kit | Hand-rolled on Tailwind tokens | shadcn / MUI | 3 views; a component lib would be 90% unused surface |
| Charts | recharts | Chart.js / visx | React-native API, themeable, small |
| Server language | TypeScript under `tsx` | Compiled JS / separate tsconfig | Same language both sides; tsx skips a build step for a 200-line server |
| Status storage | `TEXT` + app-level enum | SQL CHECK / enum type | SQLite has no enums; CHECK would also work but duplicating `STATUSES` in SQL adds a second truth to maintain |
