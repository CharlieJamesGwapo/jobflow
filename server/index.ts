import cors from 'cors'
import express, { type Request, type Response } from 'express'
import db, { STATUSES, type Job, type Status } from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

const VALID_FIELDS = [
  'company',
  'role',
  'location',
  'url',
  'salary',
  'status',
  'date_applied',
  'follow_up',
  'notes',
] as const

const sampleJobs: Array<Partial<Job>> = [
  { company: 'Linear', role: 'Frontend Engineer', location: 'Remote', url: 'https://linear.app/careers', salary: '$140k–$180k', status: 'interview', date_applied: daysAgo(24), follow_up: daysAgo(-2), notes: 'Second technical round scheduled. Prepare system design for the board component.' },
  { company: 'Vercel', role: 'Product Engineer', location: 'Remote — Global', url: 'https://vercel.com/careers', salary: '$150k–$190k', status: 'applied', date_applied: daysAgo(5), follow_up: daysAgo(-9), notes: 'Applied via careers page. Referred by a former colleague.' },
  { company: 'Figma', role: 'Software Engineer, Web', location: 'San Francisco (Hybrid)', url: '', salary: '$160k–$210k', status: 'screening', date_applied: daysAgo(11), notes: 'Recruiter call done — moved to hiring manager review.' },
  { company: 'Stripe', role: 'Full Stack Engineer', location: 'Remote', url: 'https://stripe.com/jobs', salary: '$170k–$220k', status: 'offer', date_applied: daysAgo(38), notes: 'Offer received — deadline in 2 weeks. Negotiating equity.' },
  { company: 'Notion', role: 'Web Engineer', location: 'New York', url: '', salary: '', status: 'saved', date_applied: '', follow_up: daysAgo(-3), notes: 'Great fit — tailor resume around collaboration features.' },
  { company: 'Datadog', role: 'Frontend Engineer III', location: 'Remote', url: '', salary: '$145k–$175k', status: 'rejected', date_applied: daysAgo(31), notes: 'Rejected after final round. Feedback: wanted more infra experience.' },
  { company: 'GitLab', role: 'Senior Frontend Engineer', location: 'Remote', url: 'https://gitlab.com/careers', salary: '$135k–$165k', status: 'interview', date_applied: daysAgo(17), follow_up: daysAgo(-1), notes: 'Panel interview next week: values + technical pairing.' },
  { company: 'Supabase', role: 'Product Engineer', location: 'Remote', url: '', salary: '', status: 'applied', date_applied: daysAgo(3), notes: '' },
  { company: 'Shopify', role: 'Staff Engineer, Storefront', location: 'Remote — CA', url: '', salary: '$190k–$240k', status: 'applied', date_applied: daysAgo(8), follow_up: daysAgo(-6), notes: '' },
  { company: 'Retool', role: 'Frontend Engineer', location: 'San Francisco', url: '', salary: '$150k–$185k', status: 'screening', date_applied: daysAgo(14), notes: 'Take-home assignment due Friday.' },
  { company: 'Ramp', role: 'Software Engineer', location: 'New York (Hybrid)', url: '', salary: '', status: 'rejected', date_applied: daysAgo(45), notes: '' },
  { company: 'Anthropic', role: 'Product Engineer, Claude', location: 'San Francisco', url: '', salary: '$200k–$300k', status: 'saved', date_applied: '', notes: 'Dream role — need to refresh portfolio first.' },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

app.get('/api/jobs', (req: Request, res: Response) => {
  const { status, q } = req.query
  let sql = 'SELECT * FROM jobs'
  const where: string[] = []
  const params: unknown[] = []

  if (typeof status === 'string' && STATUSES.includes(status as Status)) {
    where.push('status = ?')
    params.push(status)
  }
  if (typeof q === 'string' && q.trim()) {
    where.push('(company LIKE ? OR role LIKE ? OR location LIKE ?)')
    const like = `%${q.trim()}%`
    params.push(like, like, like)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY COALESCE(NULLIF(date_applied, \'\'), created_at) DESC, id DESC'

  res.json(db.prepare(sql).all(...params))
})

app.post('/api/jobs', (req: Request, res: Response) => {
  const b = req.body ?? {}
  if (!clean(b.company) || !clean(b.role)) {
    res.status(400).json({ error: 'company and role are required' })
    return
  }
  const status = STATUSES.includes(b.status) ? b.status : 'applied'
  const info = db
    .prepare(
      `INSERT INTO jobs (company, role, location, url, salary, status, date_applied, follow_up, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      clean(b.company),
      clean(b.role),
      clean(b.location),
      clean(b.url),
      clean(b.salary),
      status,
      clean(b.date_applied) || daysAgo(0),
      clean(b.follow_up),
      clean(b.notes),
    )
  res.status(201).json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid))
})

app.put('/api/jobs/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job | undefined
  if (!existing) {
    res.status(404).json({ error: 'not found' })
    return
  }
  const b = req.body ?? {}
  const merged: Record<string, string> = {}
  for (const f of VALID_FIELDS) {
    if (f === 'status') {
      merged.status = STATUSES.includes(b[f]) ? b[f] : existing.status
    } else {
      merged[f] = b[f] !== undefined ? clean(b[f]) : existing[f]
    }
  }
  if (!merged.company || !merged.role) {
    res.status(400).json({ error: 'company and role are required' })
    return
  }
  db.prepare(
    `UPDATE jobs SET company=?, role=?, location=?, url=?, salary=?, status=?, date_applied=?, follow_up=?, notes=?, updated_at=datetime('now')
     WHERE id=?`,
  ).run(
    merged.company, merged.role, merged.location, merged.url, merged.salary,
    merged.status, merged.date_applied, merged.follow_up, merged.notes, id,
  )
  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id))
})

app.patch('/api/jobs/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const status = req.body?.status as Status
  if (!STATUSES.includes(status)) {
    res.status(400).json({ error: 'invalid status' })
    return
  }
  const info = db.prepare("UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  if (!info.changes) {
    res.status(404).json({ error: 'not found' })
    return
  }
  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id))
})

app.delete('/api/jobs/:id', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM jobs WHERE id = ?').run(Number(req.params.id))
  if (!info.changes) {
    res.status(404).json({ error: 'not found' })
    return
  }
  res.json({ ok: true })
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM jobs').all() as Job[]
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>
  for (const j of rows) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1

  const weeks: { week: string; count: number }[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const key = start.toISOString().slice(0, 10)
    const endKey = end.toISOString().slice(0, 10)
    weeks.push({
      week: key,
      count: rows.filter((j) => j.date_applied >= key && j.date_applied < endKey).length,
    })
  }

  const applied = rows.length - byStatus.saved
  const responded = byStatus.screening + byStatus.interview + byStatus.offer + byStatus.accepted + byStatus.rejected
  const active = byStatus.applied + byStatus.screening + byStatus.interview
  const dueSoon = rows.filter(
    (j) => j.follow_up && j.follow_up <= daysAgo(-7) && !['rejected', 'accepted'].includes(j.status),
  ).length

  res.json({
    total: rows.length,
    applied,
    active,
    interviews: byStatus.interview,
    offers: byStatus.offer + byStatus.accepted,
    responseRate: applied ? Math.round((responded / applied) * 100) : 0,
    byStatus,
    weekly: weeks,
    followUpsDue: dueSoon,
  })
})

app.post('/api/seed', (_req: Request, res: Response) => {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM jobs').get() as { c: number }).c
  if (count > 0) {
    res.status(409).json({ error: 'database already has jobs' })
    return
  }
  const insert = db.prepare(
    `INSERT INTO jobs (company, role, location, url, salary, status, date_applied, follow_up, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const tx = db.transaction(() => {
    for (const j of sampleJobs) {
      insert.run(
        clean(j.company), clean(j.role), clean(j.location), clean(j.url),
        clean(j.salary), j.status ?? 'applied', clean(j.date_applied),
        clean(j.follow_up), clean(j.notes),
      )
    }
  })
  tx()
  res.status(201).json({ inserted: sampleJobs.length })
})

app.listen(3001, () => console.log('API on http://localhost:3001'))
