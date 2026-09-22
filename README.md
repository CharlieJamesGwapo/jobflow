# JobFlow — Job Application Tracker

A full-stack web app to track your job hunt end to end: from saved postings to signed offers.

![Stack](https://img.shields.io/badge/React_19-TypeScript-3178c6) ![Backend](https://img.shields.io/badge/Express_5-SQLite-7c6cff)

## Features

| View | What you get |
| --- | --- |
| **Dashboard** | Stat cards (total, applied, in progress, interviews, offers, response rate), applications-per-week area chart, pipeline-mix donut, pipeline stage bars, stage conversion rates, upcoming follow-ups, recent activity |
| **Applications** | Searchable, filterable, sortable table — inline status dropdowns, salary/location/link columns, follow-up due highlights, edit & delete actions |
| **Board** | Drag-and-drop kanban across 7 stages: Saved → Applied → Screening → Interview → Offer → Accepted / Rejected |

- Track company, role, location, salary, job URL, status, dates applied, follow-up dates, and notes
- Follow-up reminders surface overdue items on the dashboard and cards
- One-click sample data to explore the UI (`POST /api/seed`)

## Quick start

```bash
npm install
npm run dev:all      # API on :3001 + Vite dev on :5173 (single command)
```

Or run them separately:

```bash
npm run server       # Express + SQLite API → http://localhost:3001
npm run dev          # React frontend → http://localhost:5173 (proxies /api)
```

Open http://localhost:5173 — the database (`jobs.db`, SQLite/WAL) is created automatically on first run.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/jobs?status=&q=` | List applications (filter/search) |
| POST | `/api/jobs` | Create (`company`, `role` required) |
| PUT | `/api/jobs/:id` | Full update |
| PATCH | `/api/jobs/:id/status` | Move stage (kanban drag) |
| DELETE | `/api/jobs/:id` | Remove |
| GET | `/api/stats` | Aggregates: counts, response rate, weekly cadence, follow-ups due |
| POST | `/api/seed` | Insert 12 sample jobs (empty DB only) |

## Project layout

```
job-tracker/
├── index.html              # entry
├── vite.config.ts          # react + tailwind + /api proxy → :3001
├── server/
│   ├── db.ts               # better-sqlite3 schema (jobs table, WAL)
│   └── index.ts            # Express 5 REST API + stats + seed
└── src/
    ├── main.tsx
    ├── App.tsx             # shell: header nav, view switch, modals
    ├── api.ts              # typed fetch client
    ├── types.ts            # Job / Status / Stats + STATUS_META colors
    ├── index.css           # Tailwind v4 theme tokens + .card/.input/.btn
    └── components/
        ├── Dashboard.tsx         # stats, charts (recharts), follow-ups
        ├── ApplicationsTable.tsx # search/filter/sort table
        ├── KanbanBoard.tsx       # HTML5 drag-and-drop columns
        ├── JobForm.tsx           # add/edit modal
        └── ui.tsx                # StatusBadge, StatCard, date helpers
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev:all` | API + frontend together |
| `npm run dev` / `npm run server` | Either side alone |
| `npm run build` | Type-check + production bundle |
| `npm run lint` | oxlint |
