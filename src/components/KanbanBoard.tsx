import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { STATUSES, STATUS_META, type Job, type Status } from '../types'
import { fmtDate, isOverdue } from './ui'

export function KanbanBoard({
  jobs,
  onEdit,
  onStatusChange,
}: {
  jobs: Job[]
  onEdit: (j: Job) => void
  onStatusChange: (j: Job, s: Status) => void
}) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overCol, setOverCol] = useState<Status | null>(null)

  return (
    <div className="fade-in flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((status) => {
        const meta = STATUS_META[status]
        const col = jobs.filter((j) => j.status === status)
        return (
          <div
            key={status}
            className="card flex w-[240px] shrink-0 flex-col"
            style={{
              borderColor: overCol === status ? meta.dot : undefined,
              boxShadow: overCol === status ? `0 0 0 1px ${meta.dot}` : undefined,
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(status)
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              setOverCol(null)
              const j = jobs.find((x) => x.id === dragId)
              if (j && j.status !== status) onStatusChange(j, status)
              setDragId(null)
            }}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-edge)] px-3.5 py-3">
              <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} />
              <span className="text-[12px] font-bold" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="ml-auto rounded-full bg-[var(--color-panel-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-mut)]">
                {col.length}
              </span>
            </div>
            <div className="min-h-[120px] flex-1 space-y-2 p-2.5">
              {col.map((j) => (
                <div
                  key={j.id}
                  draggable
                  onDragStart={() => setDragId(j.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverCol(null)
                  }}
                  onClick={() => onEdit(j)}
                  className="cursor-grab rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel-2)] p-3 transition-all hover:border-[var(--color-edge-2)] active:cursor-grabbing"
                  style={{ opacity: dragId === j.id ? 0.4 : 1 }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-[13px] font-bold leading-tight">{j.company}</div>
                    {j.url && (
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0 text-[var(--color-dim)] hover:text-[var(--color-acc)]"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-mut)]">{j.role}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-dim)]">
                    <span>{fmtDate(j.date_applied)}</span>
                    {j.follow_up && (
                      <span style={{ color: isOverdue(j.follow_up) ? '#f87171' : undefined }}>
                        ⏰ {fmtDate(j.follow_up)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <div className="flex h-full min-h-[90px] items-center justify-center rounded-lg border border-dashed border-[var(--color-edge)] text-[11px] text-[var(--color-dim)]">
                  Drop here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
