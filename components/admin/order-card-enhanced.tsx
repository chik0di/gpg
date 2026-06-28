'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  subject_field: string
  academic_level: string
  deadline: string
  status: string
  total_amount: number
  created_at: string
  user_id: string
  client_name?: string
  client_email?: string
  deliverables_count?: number
}

interface Props {
  order: Order
  onStatusChange: (orderId: string, newStatus: string) => void
}

function getUrgencyLevel(deadline: string, status: string): 'overdue' | 'urgent' | 'comfortable' | 'completed' {
  // Completed orders always show as completed, regardless of deadline
  if (status === 'completed') return 'completed'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursRemaining < 0) return 'overdue'
  if (hoursRemaining <= 72) return 'urgent' // 3 days
  return 'comfortable'
}

function getCountdown(deadline: string): string {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  if (diff < 0) {
    const overdue = Math.abs(diff)
    const days = Math.floor(overdue / (1000 * 60 * 60 * 24))
    const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return days > 0 ? `${days}d ${hours}h overdue` : `${hours}h overdue`
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

export default function OrderCardEnhanced({ order, onStatusChange }: Props) {
  const [updating, setUpdating] = useState(false)
  const urgency = getUrgencyLevel(order.deadline, order.status)
  const countdown = getCountdown(order.deadline)

  const urgencyConfig = {
    overdue: { color: '#EF4444', bg: '#FEE2E2', label: 'Overdue' },
    urgent: { color: '#F59E0B', bg: '#FEF3C7', label: 'Urgent' },
    comfortable: { color: '#10B981', bg: '#D1FAE5', label: 'On Track' },
    completed: { color: '#10B981', bg: '#D1FAE5', label: 'Delivered' },
  }

  const statusConfig = {
    pending: { color: '#9CA3AF', bg: '#F3F4F6', label: 'Pending' },
    in_progress: { color: '#3B82F6', bg: '#DBEAFE', label: 'In Progress' },
    completed: { color: '#10B981', bg: '#D1FAE5', label: 'Completed' },
  }

  const config = urgencyConfig[urgency]
  const statusStyle = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending

  async function handleStatusChange(newStatus: string) {
    setUpdating(true)
    await onStatusChange(order.id, newStatus)
    setUpdating(false)
  }

  return (
    <div
      className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: '4px', borderLeftColor: config.color }}
    >
      <div className="p-3">
        {/* Compact header: ID + Urgency Badge */}
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-mono font-bold text-[#6B7280]">#{order.id.slice(0, 8).toUpperCase()}</p>
          {urgency === 'overdue' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: config.bg, color: config.color }}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {config.label}
            </span>
          )}
          {urgency === 'urgent' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: config.bg, color: config.color }}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {config.label}
            </span>
          )}
          {urgency === 'completed' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: config.bg, color: config.color }}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              {config.label}
            </span>
          )}
        </div>

        {/* Clickable client area */}
        <Link
          href={`/admin/orders/${order.id}`}
          className="block mb-2 group"
          onClick={(e) => {
            // Allow only this area to navigate - other elements will stopPropagation
            e.stopPropagation()
          }}
        >
          <p className="text-sm font-semibold text-[#1B2E4B] group-hover:text-[#E8A020] transition-colors cursor-pointer">
            {order.client_name || 'Client'}
          </p>
          <p className="text-xs text-[#9CA3AF] group-hover:text-[#E8A020]/70 transition-colors">
            {order.client_email}
          </p>
        </Link>

        {/* Compact info grid: Subject + Level chips inline, Deadline + Price on same line */}
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 bg-[#F5F0E8] rounded text-[10px] font-semibold text-[#1B2E4B]">
              {order.subject_field}
            </span>
            <span className="px-1.5 py-0.5 bg-[#F5F0E8] rounded text-[10px] font-semibold text-[#6B7280]">
              {order.academic_level}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-[#6B7280]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-semibold" style={{ color: config.color }}>
                {countdown}
              </span>
            </div>
            <p className="text-xs font-bold text-[#1B2E4B]">£{order.total_amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Actions row: Status + Details aligned */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E8E2D9]">
          <select
            value={order.status}
            onChange={(e) => {
              e.stopPropagation()
              handleStatusChange(e.target.value)
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={updating}
            className="flex-1 px-2 py-1 border border-[#E8E2D9] rounded-lg text-[10px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 disabled:opacity-50"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <Link
            href={`/admin/orders/${order.id}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 bg-[#1B2E4B] hover:bg-[#16253d] text-white text-[10px] font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}
