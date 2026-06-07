import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'

interface Props {
  order: {
    id: string
    subject_field: string
    academic_level: string
    deadline: string
    status: string
    total_amount: number
    created_at: string
  }
}

export default function OrderCard({ order }: Props) {
  const label = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status
  const color = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'

  const deadline = new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium' })
  const placed   = new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })
  const total    = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`

  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block group">
      <div
        className="bg-white rounded-2xl border border-[#E8E2D9] px-5 py-4 flex items-center gap-4 group-hover:border-[#E8A020]/40 group-hover:shadow-[0_4px_16px_-2px_rgba(26,26,46,0.08)] transition-all duration-200"
      >
        {/* Status dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
          style={{
            background:
              order.status === 'completed' ? '#16A34A'
              : order.status === 'in_progress' ? '#3B82F6'
              : '#E8A020',
          }}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1B2E4B] truncate">
            {order.subject_field}
            <span className="font-normal text-[#9CA3AF] ml-2">· {order.academic_level}</span>
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Placed {placed} · Due {deadline}
          </p>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-sm font-extrabold text-[#1B2E4B]">{total}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${color}`}>
            {label}
          </span>
        </div>

        {/* Arrow */}
        <svg className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#E8A020] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
