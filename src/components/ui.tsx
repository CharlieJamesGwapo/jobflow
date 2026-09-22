import { STATUS_META, type Status } from '../types'

export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, background: m.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--color-dim)]">
        {label}
      </div>
      <div
        className="mt-1.5 text-[26px] font-bold leading-none"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-[var(--color-mut)]">{hint}</div>}
    </div>
  )
}

export function fmtDate(d: string): string {
  if (!d) return '—'
  const dt = new Date(`${d}T00:00:00`)
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function isOverdue(d: string): boolean {
  if (!d) return false
  const today = new Date().toISOString().slice(0, 10)
  return d <= today
}
