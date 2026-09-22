import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { STATUSES, STATUS_META, type Job, type JobInput, type Status } from '../types'

const empty: JobInput = {
  company: '',
  role: '',
  location: '',
  url: '',
  salary: '',
  status: 'applied',
  date_applied: new Date().toISOString().slice(0, 10),
  follow_up: '',
  notes: '',
}

export function JobForm({
  job,
  onClose,
  onSave,
}: {
  job: Job | null
  onClose: () => void
  onSave: (input: JobInput) => Promise<void>
}) {
  const [form, setForm] = useState<JobInput>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (job) {
      setForm({
        company: job.company,
        role: job.role,
        location: job.location,
        url: job.url,
        salary: job.salary,
        status: job.status,
        date_applied: job.date_applied,
        follow_up: job.follow_up,
        notes: job.notes,
      })
    }
  }, [job])

  const set = (k: keyof JobInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) {
      setError('Company and role are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="card fade-in w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{job ? 'Edit application' : 'Add application'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-mut)] hover:text-[var(--color-txt)]">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Company *</span>
            <input className="input" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Figma" autoFocus />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Role *</span>
            <input className="input" value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Frontend Engineer" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Location</span>
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Remote" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Salary</span>
            <input className="input" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="$140k–$180k" />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Job URL</span>
          <input className="input" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(e) => set('status', e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Date applied</span>
            <input type="date" className="input" value={form.date_applied} onChange={(e) => set('date_applied', e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Follow up by</span>
            <input type="date" className="input" value={form.follow_up} onChange={(e) => set('follow_up', e.target.value)} />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-dim)]">Notes</span>
          <textarea
            className="input min-h-[72px] resize-y"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Referral contact, interview prep, next steps…"
          />
        </label>

        {error && <div className="text-[12px] text-red-400">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : job ? 'Save changes' : 'Add application'}
          </button>
        </div>
      </form>
    </div>
  )
}
