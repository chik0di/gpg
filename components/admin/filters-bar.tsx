'use client'

import { SUBJECT_GROUPS } from '@/lib/pricing'

export interface Filters {
  timeRange: string
  status: string
  urgency: string
  academicLevel: string
  subject: string
  sortBy: string
  search: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  onClear: () => void
  resultCount: number
  totalCount: number
}

export default function FiltersBar({ filters, onChange, onClear, resultCount, totalCount }: Props) {
  const allSubjects = SUBJECT_GROUPS.flatMap((group) => group.subjects).sort()

  const hasActiveFilters =
    filters.timeRange !== 'all' ||
    filters.status !== 'all' ||
    filters.urgency !== 'all' ||
    filters.academicLevel !== 'all' ||
    filters.subject !== 'all' ||
    filters.search !== ''

  return (
    <div className="bg-white rounded-xl border border-[#E8E2D9] p-4" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
      <div className="space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by client name, email, order ID, or subject..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full px-4 py-2.5 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
          />
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Time Range */}
          <select
            value={filters.timeRange}
            onChange={(e) => onChange({ ...filters, timeRange: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="all">All time</option>
            <option value="6h">Last 6 hours</option>
            <option value="12h">Last 12 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Urgency */}
          <select
            value={filters.urgency}
            onChange={(e) => onChange({ ...filters, urgency: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="all">All urgency</option>
            <option value="urgent">Urgent (within 3 days)</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Academic Level */}
          <select
            value={filters.academicLevel}
            onChange={(e) => onChange({ ...filters, academicLevel: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="all">All levels</option>
            <option value="A-Level / College">A-Level</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Masters">Masters</option>
          </select>

          {/* Subject */}
          <select
            value={filters.subject}
            onChange={(e) => onChange({ ...filters, subject: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="all">All subjects</option>
            {allSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
            className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="deadline_soon">Deadline soonest</option>
            <option value="deadline_late">Deadline latest</option>
            <option value="highest_value">Highest value</option>
            <option value="lowest_value">Lowest value</option>
          </select>
        </div>

        {/* Result count and clear */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D9]">
          <p className="text-sm font-semibold text-[#6B7280]">
            Showing <span className="text-[#1B2E4B]">{resultCount}</span> of{' '}
            <span className="text-[#1B2E4B]">{totalCount}</span> orders
          </p>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="text-sm font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
