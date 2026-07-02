'use client'

import { useState, useMemo } from 'react'
import StatsStrip from './stats-strip'
import FiltersBar, { type Filters } from './filters-bar'
import UrgentPanel from './urgent-panel'
import OrderCardEnhanced from './order-card-enhanced'
import Pagination from './pagination'

interface Order {
  id: string
  status: string
  total_amount: number
  academic_level: string
  subject_field: string
  deadline: string
  created_at: string
  user_id: string
  client_name?: string
  client_email?: string
  deliverables_count?: number
}

interface Props {
  initialOrders: Order[]
}

const ORDERS_PER_PAGE = 20

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

export default function AdminDashboard({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    timeRange: 'all',
    status: 'active', // Default to showing only pending and in_progress orders
    urgency: 'all',
    academicLevel: 'all',
    subject: 'all',
    sortBy: 'newest',
    search: '',
  })

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const pending = orders.filter(o => o.status === 'pending').length
    const inProgress = orders.filter(o => o.status === 'in_progress').length
    const completed = orders.filter(o => o.status === 'completed').length
    const urgent = orders.filter(o => isUrgent(o.deadline) && o.status !== 'completed').length

    return { totalOrders, pending, inProgress, completed, urgent }
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    // Time range
    const timeFilter = getTimeRangeFilter(filters.timeRange)
    if (timeFilter) {
      filtered = filtered.filter(o => new Date(o.created_at) >= timeFilter)
    }

    // Status
    if (filters.status === 'active') {
      filtered = filtered.filter(o => o.status === 'pending' || o.status === 'in_progress')
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
        o.subject_field.toLowerCase().includes(search)
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
  }, [orders, filters])

  // Urgent panel orders (within 48 hours)
  const urgentPanelOrders = useMemo(() => {
    return orders
      .filter(o => isWithin48Hours(o.deadline) && o.status !== 'completed')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [orders])

  // Get set of urgent panel order IDs for filtering
  const urgentPanelOrderIds = useMemo(() => {
    return new Set(urgentPanelOrders.map(o => o.id))
  }, [urgentPanelOrders])

  // Filter out urgent panel orders from main list to avoid duplication
  const mainListOrders = useMemo(() => {
    return filteredOrders.filter(o => !urgentPanelOrderIds.has(o.id))
  }, [filteredOrders, urgentPanelOrderIds])

  // Pagination
  const totalPages = Math.ceil(mainListOrders.length / ORDERS_PER_PAGE)
  const paginatedOrders = mainListOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  )

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters({
      timeRange: 'all',
      status: 'active',
      urgency: 'all',
      academicLevel: 'all',
      subject: 'all',
      sortBy: 'newest',
      search: '',
    })
    setCurrentPage(1)
  }

  const handleStatFilterClick = (filter: string | null) => {
    if (filter === null) {
      handleClearFilters()
    } else {
      setFilters(prev => ({ ...prev, status: filter, urgency: 'all' }))
      setCurrentPage(1)
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert on error
        setOrders(initialOrders)
        alert('Failed to update status')
      }
    } catch (err) {
      setOrders(initialOrders)
      alert('Failed to update status')
    }
  }

  // Empty state messages
  const getEmptyStateMessage = () => {
    if (filters.urgency === 'urgent') return "No urgent orders right now — you're on top of things! 🎉"
    if (filters.urgency === 'overdue') return "No overdue orders — excellent work! ✨"
    if (filters.status === 'pending') return "No pending orders at the moment."
    if (filters.status === 'in_progress') return "No orders in progress right now."
    if (filters.status === 'completed') return "No completed orders yet."
    if (filters.search) return `No orders match "${filters.search}"`
    return "No orders found with the current filters."
  }

  return (
    <div className="space-y-6">
      {/* Stats Strip */}
      <StatsStrip
        stats={stats}
        activeFilter={filters.status === 'all' ? null : filters.status}
        onFilterClick={handleStatFilterClick}
      />

      {/* Filters Bar */}
      <FiltersBar
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
        resultCount={filteredOrders.length}
        totalCount={orders.length}
      />

      {/* Urgent Panel */}
      {urgentPanelOrders.length > 0 && (
        <UrgentPanel orders={urgentPanelOrders} onStatusChange={handleStatusChange} />
      )}

      {/* Orders List */}
      {paginatedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#1B2E4B] mb-1">No orders found</p>
          <p className="text-sm text-[#9CA3AF]">{getEmptyStateMessage()}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map(order => (
              <OrderCardEnhanced key={order.id} order={order} onStatusChange={handleStatusChange} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
