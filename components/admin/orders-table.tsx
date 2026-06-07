import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'

interface Order {
  id: string
  subject: string
  assignment_type: string
  word_count: number
  deadline: string
  status: string
  created_at: string
  profiles?: { email: string } | null
}

interface OrdersTableProps {
  orders: Order[]
  showUser?: boolean
}

export default function OrdersTable({ orders, showUser = false }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No orders yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
            {showUser && <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>}
            <th className="text-left px-4 py-3 font-medium text-gray-500">Assignment</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Words</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Deadline</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => {
            const statusLabel = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status
            const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
            return (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-brand-600 hover:underline">
                    {order.id.slice(0, 8)}
                  </Link>
                </td>
                {showUser && (
                  <td className="px-4 py-3 text-gray-600">{order.profiles?.email ?? '—'}</td>
                )}
                <td className="px-4 py-3 text-gray-900">
                  {order.assignment_type} · {order.subject}
                </td>
                <td className="px-4 py-3 text-gray-600">{order.word_count}</td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
