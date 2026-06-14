'use client'

import { useState } from 'react'
import OrderCardEnhanced from './order-card-enhanced'

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
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: string) => void
}

export default function UrgentPanel({ orders, onStatusChange }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (orders.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#EF4444] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-5 py-3 bg-[#FEE2E2] hover:bg-[#FECACA] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF4444]"></span>
          </span>
          <h2 className="text-base font-bold text-[#EF4444]">
            Needs Attention — {orders.length} order{orders.length !== 1 ? 's' : ''} due within 48 hours
          </h2>
        </div>
        <svg
          className="w-5 h-5 text-[#EF4444] transition-transform"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3 bg-[#FFF5F5]">
          {orders.map((order) => (
            <OrderCardEnhanced key={order.id} order={order} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
