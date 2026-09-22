import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { STATUSES, STATUS_META, type Job, type Status } from '../types'
import { fmtDate, isOverdue, StatusBadge } from './ui'

export function ApplicationsTable({
  jobs,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  jobs: Job[]
  onEdit: (j: Job) => void
  onDelete: (j: Job) => void
  onStatusChange: (j: Job, s: Status) => void
}) {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return jobs
      .filter(
        (j) =>
          (!statusFilter || j.status === statusFilter) &&
          (!needle ||
            j.company.toLowerCase().includes(needle) ||
            j.role.toLowerCase().includes(needle) ||
            j.location.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        const da = a.date_applied || a.created_at.slice(0, 10)
        const db = b.date_applied || b.created_at.slice(0, 10)
        return sortAsc ? da.localeCompare(db) : db.localeCompare(da)
      })
  }, [jobs, q, statusFilter, sortAsc])

  return (
    <div className="fade-in space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search company, role, location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <FilterChip active={statusFilter === ''} onClick={() => setStatusFilter('')}>
            All
          </FilterChip>
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              color={STATUS_META[s].dot}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            >
              {STATUS_META[s].label}
            </FilterChip>
          ))}
        </div>
        <div className="ml-auto text-[12px] text-[var(--color-dim)]">
          {filtered.length} of {jobs.length}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-edge)] text-[11px] uppercase tracking-wider text-[var(--color-dim)]">
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="cursor-pointer px-4 py-3 font-semibold select-none" onClick={() => setSortAsc((v) => !v)}>
                Applied {sortAsc ? '↑' : '↓'}
              </th>
              <th className="px-4 py-3 font-semibold">Follow-up</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-edge)]">
            {filtered.map((j) => (
              <tr key={j.id} className="group hover:bg-[var(--color-panel-2)]/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-semibold">
                    {j.company}
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noreferrer" className="text-[var(--color-dim)] hover:text-[var(--color-acc)]">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {j.salary && <div className="text-[11px] text-[var(--color-dim)]">{j.salary}</div>}
                </td>
                <td className="px-4 py-3 text-[var(--color-mut)]">{j.role}</td>
                <td className="px-4 py-3 text-[var(--color-mut)]">{j.location || '—'}</td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <StatusBadge status={j.status} />
                    <select
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={j.status}
                      onChange={(e) => onStatusChange(j, e.target.value as Status)}
                      title="Change status"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-mut)]">{fmtDate(j.date_applied)}</td>
                <td className="px-4 py-3">
                  {j.follow_up ? (
                    <span className="text-[12px] font-medium" style={{ color: isOverdue(j.follow_up) ? '#f87171' : 'var(--color-mut)' }}>
                      {isOverdue(j.follow_up) ? '● ' : ''}
                      {fmtDate(j.follow_up)}
                    </span>
                  ) : (
                    <span className="text-[var(--color-dim)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="btn btn-ghost !px-2 !py-1.5" onClick={() => onEdit(j)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-danger !px-2 !py-1.5" onClick={() => onDelete(j)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-dim)]">
                  No applications match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterChip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
      style={{
        borderColor: active ? (color ?? 'var(--color-acc)') : 'var(--color-edge-2)',
        color: active ? (color ?? 'var(--color-acc-2)') : 'var(--color-mut)',
        background: active ? 'var(--color-panel-2)' : 'transparent',
      }}
    >
      {children}
    </button>
  )
}
