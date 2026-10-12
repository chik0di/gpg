import type { Filters } from '@/components/admin/filters-bar'

export interface AdminQueueOrder {
  id: string
  status: string
  total_amount: number
  academic_level: string
  subject_field: string
  deadline: string
  created_at: string
  user_id: string
  module_name?: string | null
  client_name?: string
  client_email?: string
  is_outside_standard_fields?: boolean
  has_active_revision?: boolean
  deliverables_count?: number
}


function getTimeRangeFilter(timeRange: string): Date | null {
  const now = new Date()
  switch (timeRange) {
    case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000)
    case '12h': return new Date(now.getTime() - 12 * 60 * 60 * 1000)
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '3d': return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default: return null
  }
}

function isUrgent(deadline: string): boolean {
  const deadlineDate = new Date(deadline)
  const hoursRemaining = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60)
  return hoursRemaining > 0 && hoursRemaining <= 72 // Within 3 days
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

function isWithin48Hours(deadline: string): boolean {
  const deadlineDate = new Date(deadline)
  const hoursRemaining = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60)
  return hoursRemaining > 0 && hoursRemaining <= 48
}

export function filterAdminOrders(orders: AdminQueueOrder[], filters: Filters) {
  let filtered = [...orders]

  // Time range
  const timeFilter = getTimeRangeFilter(filters.timeRange)
  if (timeFilter) {
    filtered = filtered.filter(o => new Date(o.created_at) >= timeFilter)
  }

  // Status
  if (filters.status === 'active') {
    filtered = filtered.filter(o => o.status === 'pending' || o.status === 'in_progress' || o.has_active_revision)
  } else if (filters.status === 'revisions') {
    filtered = filtered.filter(o => o.has_active_revision)
  } else if (filters.status !== 'all') {
    filtered = filtered.filter(o => o.status === filters.status)
  }

  // Urgency
  if (filters.urgency === 'urgent') {
    filtered = filtered.filter(o => isUrgent(o.deadline) && o.status !== 'completed')
  } else if (filters.urgency === 'overdue') {
    filtered = filtered.filter(o => isOverdue(o.deadline) && o.status !== 'completed')
  }

  // Academic level
  if (filters.academicLevel !== 'all') {
    filtered = filtered.filter(o => o.academic_level === filters.academicLevel)
  }

  // Subject
  if (filters.subject !== 'all') {
    filtered = filtered.filter(o => o.subject_field === filters.subject)
  }

  // Search
  if (filters.search) {
    const search = filters.search.toLowerCase()
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(search) ||
      o.client_name?.toLowerCase().includes(search) ||
      o.client_email?.toLowerCase().includes(search) ||
      o.subject_field.toLowerCase().includes(search) ||
      o.module_name?.toLowerCase().includes(search)
    )
  }

  // Sort
  switch (filters.sortBy) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      break
    case 'deadline_soon':
      filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      break
    case 'deadline_late':
      filtered.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())
      break
    case 'highest_value':
      filtered.sort((a, b) => b.total_amount - a.total_amount)
      break
    case 'lowest_value':
      filtered.sort((a, b) => a.total_amount - b.total_amount)
      break
    default: // newest
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  return filtered
}

export function needsAttention(order: AdminQueueOrder) {
  return !!order.has_active_revision || (order.status !== 'completed' && (isOverdue(order.deadline) || isWithin48Hours(order.deadline)))
}

export { isUrgent, isOverdue }
