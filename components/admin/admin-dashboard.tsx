'use client'

import { useState, useMemo, useEffect } from 'react'
import StatsStrip from './stats-strip'
import FiltersBar, { type Filters } from './filters-bar'
import UrgentPanel from './urgent-panel'
import OrderCardEnhanced from './order-card-enhanced'
import Pagination from './pagination'
import { useRouter } from 'next/navigation'
import { filterAdminOrders, needsAttention, isUrgent, type AdminQueueOrder as Order } from '@/lib/admin-order-queue'


interface Props {
  initialOrders: Order[]
}

const ORDERS_PER_PAGE = 20

export default function AdminDashboard({ initialOrders }: Props) {
  const router = useRouter()
  const [notice, setNotice] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    timeRange: 'all',
    status: 'active', // Include unfinished orders and active revisions
    urgency: 'all',
    academicLevel: 'all',
    subject: 'all',
    sortBy: 'newest',
    search: '',
  })

  useEffect(() => { setOrders(initialOrders) }, [initialOrders])

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
    return filterAdminOrders(orders, filters)
  }, [orders, filters])

  // Orders and revisions needing attention
  const urgentPanelOrders = useMemo(() => {
    return filteredOrders
      .filter(needsAttention)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [filteredOrders])

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
  const visiblePage = Math.min(currentPage, Math.max(1, totalPages))
  const paginatedOrders = mainListOrders.slice(
    (visiblePage - 1) * ORDERS_PER_PAGE,
    visiblePage * ORDERS_PER_PAGE
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
      setFilters({ timeRange: 'all', status: 'all', urgency: 'all', academicLevel: 'all', subject: 'all', sortBy: 'newest', search: '' })
      setCurrentPage(1)
    } else if (filter === 'urgent') {
      setFilters(prev => ({ ...prev, status: 'all', urgency: 'urgent' }))
      setCurrentPage(1)
    } else {
      setFilters(prev => ({ ...prev, status: filter, urgency: 'all' }))
      setCurrentPage(1)
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to update status.')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: result.status } : o))
      setNotice(result.warning ?? 'Order status updated.')
      router.refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to update status. Please try again.')
    }
  }

  // Empty state messages
  const getEmptyStateMessage = () => {
    if (filters.search) return `No orders match "${filters.search}"`
    if (filters.urgency === 'urgent') return "No urgent orders right now — you're on top of things!"
    if (filters.urgency === 'overdue') return "No overdue orders — excellent work!"
    if (filters.status === 'pending') return "No pending orders at the moment."
    if (filters.status === 'in_progress') return "No orders in progress right now."
    if (filters.status === 'completed') return "No completed orders yet."
    if (filters.status === 'revisions') return 'No active revision requests.'
    return "No orders found with the current filters."
  }

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-xl border border-[#E8E2D9] bg-white p-4 text-sm text-[#1B2E4B]">{notice}</p>}
      {/* Stats Strip */}
      <StatsStrip
        stats={stats}
        activeFilter={filters.urgency === 'urgent' ? 'urgent' : filters.status === 'all' ? null : filters.status}
        onFilterClick={handleStatFilterClick}
      />

      <button type="button" onClick={() => router.refresh()} className="px-4 py-2 rounded-xl border border-[#E8E2D9] bg-white text-sm font-semibold text-[#1B2E4B]">Refresh orders</button>

      <button className="px-4 py-2 rounded-xl border border-[#E8E2D9] bg-white text-sm font-semibold text-[#1B2E4B]" onClick={() => handleStatFilterClick('revisions')}>
        Active revision requests ({orders.filter(o => o.has_active_revision).length})
      </button>

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
      {filteredOrders.length === 0 ? (
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
                currentPage={visiblePage}
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
