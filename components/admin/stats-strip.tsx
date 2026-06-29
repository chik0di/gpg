'use client'

interface Stats {
  totalOrders: number
  pending: number
  inProgress: number
  completed: number
  urgent: number
}

interface Props {
  stats: Stats
  activeFilter: string | null
  onFilterClick: (filter: string | null) => void
}

export default function StatsStrip({ stats, activeFilter, onFilterClick }: Props) {
  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      filter: null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: stats.pending,
      filter: 'pending',
      color: '#9CA3AF',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      filter: 'in_progress',
      color: '#3B82F6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: stats.completed,
      filter: 'completed',
      color: '#10B981',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Urgent',
      value: stats.urgent,
      filter: 'urgent',
      color: '#F59E0B',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statCards.map((card) => {
        const isActive = activeFilter === card.filter
        return (
          <button
            key={card.label}
            onClick={() => onFilterClick(card.filter)}
            className="bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md"
            style={{
              borderColor: isActive ? '#E8A020' : '#E8E2D9',
              background: isActive ? '#FDF3DC' : '#fff',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: card.color ? `${card.color}20` : '#F5F0E8',
                  color: card.color || '#1B2E4B',
                }}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#1B2E4B] mb-1">{card.value}</p>
            <p className="text-xs font-semibold text-[#6B7280]">{card.label}</p>
          </button>
        )
      })}
    </div>
  )
}
