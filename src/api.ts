import type { Job, JobInput, Stats, Status } from './types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  listJobs: (params?: { status?: Status; q?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.q) sp.set('q', params.q)
    const qs = sp.toString()
    return req<Job[]>(`/api/jobs${qs ? `?${qs}` : ''}`)
  },
  createJob: (job: JobInput) =>
    req<Job>('/api/jobs', { method: 'POST', body: JSON.stringify(job) }),
  updateJob: (id: number, job: Partial<JobInput>) =>
    req<Job>(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) }),
  setStatus: (id: number, status: Status) =>
    req<Job>(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteJob: (id: number) =>
    req<{ ok: true }>(`/api/jobs/${id}`, { method: 'DELETE' }),
  stats: () => req<Stats>('/api/stats'),
  seed: () =>
    req<{ inserted: number }>('/api/seed', { method: 'POST', body: '{}' }),
}
