import Database from 'better-sqlite3'
import path from 'node:path'

export type Status =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'accepted'
  | 'rejected'

export const STATUSES: Status[] = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'accepted',
  'rejected',
]

export interface Job {
  id: number
  company: string
  role: string
  location: string
  url: string
  salary: string
  status: Status
  date_applied: string
  follow_up: string
  notes: string
  created_at: string
  updated_at: string
}

const db = new Database(path.join(process.cwd(), 'jobs.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    salary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'applied',
    date_applied TEXT NOT NULL DEFAULT '',
    follow_up TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

export default db
