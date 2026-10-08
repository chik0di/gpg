import Link from 'next/link'
import type { ReactNode } from 'react'
import StatusBadge from '@/components/shared/status-badge'

export interface OrderCardData {
  id: string
  subject_field: string
  academic_level: string
  deadline: string
  status: string
  total_amount: number
  created_at: string
  module_name?: string | null
}

export default function OrderCard({ order, children }: { order: OrderCardData; children?: ReactNode }) {
  const deadline = new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
  const placed = new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
  const total = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`
  return <article className="ui-card overflow-hidden">
    <Link href={`/dashboard/orders/${order.id}`} className="group block p-4 sm:p-5 hover:bg-[#FAFBFD] transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span className="text-xs text-[#64748B] font-mono">Order #{order.id.slice(0, 8).toUpperCase()}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#1B2E4B] break-words">{order.module_name || order.subject_field}</h3>
          <p className="text-sm text-[#64748B] mt-1">{order.academic_level}</p>
        </div>
        <span className="text-base font-semibold text-[#1B2E4B] tabular-nums shrink-0">{total}</span>
      </div>
      <div className="mt-4 pt-3 border-t border-[#E8E2D9] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[#64748B]">
        <p>Placed {placed} <span className="mx-1" aria-hidden="true">·</span> Due {deadline}</p>
        <span className="text-[#1B2E4B] font-semibold inline-flex items-center gap-2">View order <span aria-hidden="true">→</span></span>
      </div>
    </Link>
    {children && <div className="px-4 sm:px-5 py-3 border-t border-[#E8E2D9]">{children}</div>}
  </article>
}
