import { Briefcase, KanbanSquare, LayoutDashboard, Plus, Table2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { ApplicationsTable } from './components/ApplicationsTable'
import { Dashboard } from './components/Dashboard'
import { JobForm } from './components/JobForm'
import { KanbanBoard } from './components/KanbanBoard'
import type { Job, JobInput, Stats, Status } from './types'

type View = 'dashboard' | 'table' | 'board'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([api.listJobs(), api.stats()])
      setJobs(j)
      setStats(s)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = async (input: JobInput) => {
    if (editing) await api.updateJob(editing.id, input)
    else await api.createJob(input)
    setEditing(null)
    await refresh()
  }

  const changeStatus = async (j: Job, status: Status) => {
    // optimistic update for snappy drag & drop
    setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status } : x)))
    try {
      await api.setStatus(j.id, status)
      await refresh()
    } catch {
      await refresh()
    }
  }

  const remove = async (j: Job) => {
    await api.deleteJob(j.id)
    setConfirmDelete(null)
    await refresh()
  }

  const seed = async () => {
    try {
      await api.seed()
    } catch {
      /* already seeded */
    }
    await refresh()
  }

  const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'table', label: 'Applications', icon: <Table2 size={15} /> },
    { id: 'board', label: 'Board', icon: <KanbanSquare size={15} /> },
  ]

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-[var(--color-edge)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-acc)]">
            <Briefcase size={15} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight">JobFlow</div>
            <div className="text-[10px] font-medium text-[var(--color-dim)]">Application tracker</div>
          </div>
        </div>

        <nav className="mx-auto flex items-center gap-1 rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)] p-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-all"
              style={{
                background: view === n.id ? 'var(--color-acc)' : 'transparent',
                color: view === n.id ? '#fff' : 'var(--color-mut)',
              }}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={14} />
          Add application
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="card mb-4 border-red-500/40 p-3 text-[13px] text-red-300">
            {error} — is the API server running? (<code>npm run server</code>)
          </div>
        )}
        {view === 'dashboard' && <Dashboard stats={stats} jobs={jobs} onSeed={seed} />}
        {view === 'table' && (
          <ApplicationsTable
            jobs={jobs}
            onEdit={(j) => {
              setEditing(j)
              setFormOpen(true)
            }}
            onDelete={setConfirmDelete}
            onStatusChange={changeStatus}
          />
        )}
        {view === 'board' && (
          <KanbanBoard
            jobs={jobs}
            onEdit={(j) => {
              setEditing(j)
              setFormOpen(true)
            }}
            onStatusChange={changeStatus}
          />
        )}
      </main>

      {formOpen && (
        <JobForm
          job={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={save}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="card fade-in w-full max-w-sm p-6">
            <h3 className="text-base font-bold">Delete application?</h3>
            <p className="mt-2 text-[13px] text-[var(--color-mut)]">
              Remove <b>{confirmDelete.company}</b> — {confirmDelete.role}? This can't be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="btn !bg-red-500/90 !text-white hover:!bg-red-500"
                onClick={() => remove(confirmDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
