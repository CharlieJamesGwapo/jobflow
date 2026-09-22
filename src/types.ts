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

export const STATUS_META: Record<
  Status,
  { label: string; color: string; bg: string; dot: string }
> = {
  saved: {
    label: 'Saved',
    color: '#8b93b8',
    bg: 'rgba(139,147,184,0.12)',
    dot: '#8b93b8',
  },
  applied: {
    label: 'Applied',
    color: '#7c9dff',
    bg: 'rgba(124,157,255,0.14)',
    dot: '#7c9dff',
  },
  screening: {
    label: 'Screening',
    color: '#4fd8e8',
    bg: 'rgba(79,216,232,0.13)',
    dot: '#4fd8e8',
  },
  interview: {
    label: 'Interview',
    color: '#c98cff',
    bg: 'rgba(201,140,255,0.15)',
    dot: '#c98cff',
  },
  offer: {
    label: 'Offer',
    color: '#ffd166',
    bg: 'rgba(255,209,102,0.13)',
    dot: '#ffd166',
  },
  accepted: {
    label: 'Accepted',
    color: '#5eeaa4',
    bg: 'rgba(94,234,164,0.13)',
    dot: '#5eeaa4',
  },
  rejected: {
    label: 'Rejected',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.11)',
    dot: '#f87171',
  },
}

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

export interface JobInput {
  company: string
  role: string
  location: string
  url: string
  salary: string
  status: Status
  date_applied: string
  follow_up: string
  notes: string
}

export interface Stats {
  total: number
  applied: number
  active: number
  interviews: number
  offers: number
  responseRate: number
  byStatus: Record<Status, number>
  weekly: { week: string; count: number }[]
  followUpsDue: number
}
