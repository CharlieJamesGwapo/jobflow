import { Briefcase, CalendarClock, FileText, MessageSquare, TrendingUp, Trophy } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { STATUSES, STATUS_META, type Job, type Stats } from '../types'
import { fmtDate, isOverdue, StatCard, StatusBadge } from './ui'

export function Dashboard({
  stats,
  jobs,
  onSeed,
}: {
  stats: Stats | null
  jobs: Job[]
  onSeed: () => void
}) {
  if (!stats) {
    return <div className="text-[var(--color-mut)] p-8">Loading dashboard…</div>
  }

  if (stats.total === 0) {
    return (
      <div className="card fade-in mx-auto mt-24 max-w-md p-10 text-center">
        <Briefcase className="mx-auto text-[var(--color-acc)]" size={36} />
        <h2 className="mt-4 text-xl font-bold">No applications yet</h2>
        <p className="mt-2 text-sm text-[var(--color-mut)]">
          Add your first application, or load sample data to explore the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="btn btn-ghost" onClick={onSeed}>
            Load sample data
          </button>
        </div>
      </div>
    )
  }

  const maxStatus = Math.max(1, ...STATUSES.map((s) => stats.byStatus[s] ?? 0))
  const upcoming = jobs
    .filter((j) => j.follow_up && !['rejected', 'accepted'].includes(j.status))
    .sort((a, b) => a.follow_up.localeCompare(b.follow_up))
    .slice(0, 5)

  const donutData = STATUSES.filter((s) => stats.byStatus[s] > 0).map((s) => ({
    name: STATUS_META[s].label,
    value: stats.byStatus[s],
    color: STATUS_META[s].dot,
  }))

  const weeklyData = stats.weekly.map((w) => ({
    week: new Date(`${w.week}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    apps: w.count,
  }))

  return (
    <div className="fade-in space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total tracked" value={stats.total} />
        <StatCard label="Applied" value={stats.applied} accent="#7c9dff" />
        <StatCard label="In progress" value={stats.active} accent="#4fd8e8" />
        <StatCard label="Interviews" value={stats.interviews} accent="#c98cff" />
        <StatCard label="Offers" value={stats.offers} accent="#ffd166" />
        <StatCard
          label="Response rate"
          value={`${stats.responseRate}%`}
          accent="#5eeaa4"
          hint={`${stats.followUpsDue} follow-up${stats.followUpsDue === 1 ? '' : 's'} due`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--color-acc)]" />
            <h3 className="text-sm font-bold">Applications per week</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c6cff" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7c6cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#232a45" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#5a6184', fontSize: 11 }}
                  axisLine={{ stroke: '#232a45' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#5a6184', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#171c31',
                    border: '1px solid #2d3554',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#8b93b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="apps"
                  stroke="#7c6cff"
                  strokeWidth={2}
                  fill="url(#appsGrad)"
                  name="Applications"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare size={15} className="text-[var(--color-acc)]" />
            <h3 className="text-sm font-bold">Pipeline mix</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#171c31',
                    border: '1px solid #2d3554',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-[var(--color-mut)]">
                <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                {d.name} <span className="ml-auto font-semibold text-[var(--color-txt)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={15} className="text-[var(--color-acc)]" />
            <h3 className="text-sm font-bold">Pipeline stages</h3>
          </div>
          <div className="space-y-2.5">
            {STATUSES.map((s) => {
              const n = stats.byStatus[s] ?? 0
              const meta = STATUS_META[s]
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-20 text-[12px] font-medium text-[var(--color-mut)]">
                    {meta.label}
                  </div>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-[var(--color-panel-2)]">
                    <div
                      className="flex h-full items-center rounded-md px-2 text-[11px] font-bold transition-all duration-500"
                      style={{
                        width: `${Math.max(n ? 8 : 0, (n / maxStatus) * 100)}%`,
                        background: meta.bg,
                        color: meta.color,
                        minWidth: n ? 26 : 0,
                      }}
                    >
                      {n}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-[var(--color-edge)] pt-3 text-[11px] text-[var(--color-dim)]">
            Conversion: applied → interview{' '}
            <span className="font-semibold text-[var(--color-txt)]">
              {stats.applied ? Math.round((stats.interviews / stats.applied) * 100) : 0}%
            </span>
            {' · '}interview → offer{' '}
            <span className="font-semibold text-[var(--color-txt)]">
              {stats.interviews ? Math.round((stats.offers / stats.interviews) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock size={15} className="text-[var(--color-acc)]" />
            <h3 className="text-sm font-bold">Upcoming follow-ups</h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-[12px] text-[var(--color-dim)]">
              Nothing scheduled — set a follow-up date on any application.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{j.company}</div>
                    <div className="truncate text-[11px] text-[var(--color-mut)]">{j.role}</div>
                  </div>
                  <div
                    className="shrink-0 text-[11px] font-semibold"
                    style={{ color: isOverdue(j.follow_up) ? '#f87171' : '#8b93b8' }}
                  >
                    {isOverdue(j.follow_up) ? 'Due ' : ''}
                    {fmtDate(j.follow_up)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {stats.offers > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[rgba(255,209,102,0.08)] p-2.5 text-[12px] text-[#ffd166]">
              <Trophy size={13} />
              {stats.offers} offer{stats.offers === 1 ? '' : 's'} on the table
            </div>
          )}
        </div>
      </div>

      <RecentActivity jobs={jobs} />
    </div>
  )
}

function RecentActivity({ jobs }: { jobs: Job[] }) {
  const recent = [...jobs]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6)
  if (!recent.length) return null
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-bold">Recent activity</h3>
      <div className="divide-y divide-[var(--color-edge)]">
        {recent.map((j) => (
          <div key={j.id} className="flex items-center gap-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel-2)] text-[12px] font-bold text-[var(--color-acc)]">
              {j.company.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold">{j.company}</span>
              <span className="text-[12px] text-[var(--color-mut)]"> — {j.role}</span>
            </div>
            <StatusBadge status={j.status} />
            <div className="w-24 shrink-0 text-right text-[11px] text-[var(--color-dim)]">
              {fmtDate(j.updated_at.slice(0, 10))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
