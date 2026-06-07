import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'

export const metadata: Metadata = { title: 'Admin — Orders' }

// Row type coming back from the joined query
interface AdminOrder {
  id: string
  status: string
  total_amount: number
  academic_level: string
  subject_field: string
  deadline: string
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; email: string } | null
  deliverables: Array<{ type: string; subtype: string | null; size_band: string | null; price: number }>
  order_files: Array<{ file_url: string; file_type: string }>
}

function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status
  const color = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {label}
    </span>
  )
}

function deliverableDesc(d: AdminOrder['deliverables'][number]): string {
  if (d.type === 'written')       return `Written — ${d.size_band ?? '?'} pages`
  if (d.type === 'presentation')  return `Presentation — ${d.subtype ?? '?'}`
  if (d.type === 'practical')     return `Practical — ${d.subtype ?? '?'}`
  return d.type
}

export default async function AdminOrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_amount, academic_level, subject_field, deadline, created_at,
      profiles ( first_name, last_name, email ),
      deliverables ( type, subtype, size_band, price ),
      order_files ( file_url, file_type )
    `)
    .order('created_at', { ascending: false }) as { data: AdminOrder[] | null }

  const stats = {
    total:       (orders ?? []).length,
    pending:     (orders ?? []).filter((o) => o.status === 'pending').length,
    in_progress: (orders ?? []).filter((o) => o.status === 'in_progress').length,
    completed:   (orders ?? []).filter((o) => o.status === 'completed').length,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Order Queue</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">{stats.total} total orders</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: stats.total,       color: '#1B2E4B' },
          { label: 'Pending',     value: stats.pending,     color: '#E8A020' },
          { label: 'In Progress', value: stats.in_progress, color: '#3B82F6' },
          { label: 'Completed',   value: stats.completed,   color: '#16A34A' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E8E2D9] px-5 py-4" style={{ boxShadow: '0 1px 4px rgba(26,26,46,0.05)' }}>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Order list */}
      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] py-20 text-center">
          <p className="text-sm text-[#9CA3AF]">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const client      = order.profiles
            const clientName  = [client?.first_name, client?.last_name].filter(Boolean).join(' ') || '—'
            const assignFile  = order.order_files.find((f) => f.file_type === 'assignment')
            const deadline    = new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium' })
            const placed      = new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })
            const total       = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`
            const isUrgent    = new Date(order.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#E8E2D9] p-5"
                style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#9CA3AF]">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <StatusBadge status={order.status} />
                    {isUrgent && order.status !== 'completed' && (
                      <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-red-100 text-red-600">
                        URGENT
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="shrink-0 px-4 py-1.5 text-xs font-bold border-2 border-[#1B2E4B] text-[#1B2E4B] rounded-xl hover:bg-[#1B2E4B] hover:text-white transition-all"
                  >
                    Manage →
                  </Link>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-4">
                  <div>
                    <p className="text-[0.65rem] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Client</p>
                    <p className="text-sm font-semibold text-[#1B2E4B] truncate">{clientName}</p>
                    <p className="text-xs text-[#9CA3AF] truncate">{client?.email}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Subject / Level</p>
                    <p className="text-sm font-semibold text-[#1B2E4B]">{order.subject_field}</p>
                    <p className="text-xs text-[#9CA3AF]">{order.academic_level}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Deadline</p>
                    <p className="text-sm font-semibold" style={{ color: isUrgent ? '#DC2626' : '#1B2E4B' }}>
                      {deadline}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">Placed {placed}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Total paid</p>
                    <p className="text-sm font-extrabold text-[#1B2E4B]">{total}</p>
                  </div>
                </div>

                {/* Deliverables */}
                {order.deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.deliverables.map((d, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium bg-[#F5F0E8] text-[#6B7280]"
                      >
                        {deliverableDesc(d)}
                        <span className="ml-1.5 font-bold text-[#1B2E4B]">
                          £{d.price % 1 === 0 ? d.price : d.price.toFixed(2)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Assignment file */}
                {assignFile && (
                  <AssignmentDownload orderId={order.id} path={assignFile.file_url} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

async function AssignmentDownload({ orderId, path }: { orderId: string; path: string }) {
  const { data } = await supabaseAdmin.storage
    .from('order-files')
    .createSignedUrl(path, 3600)

  if (!data?.signedUrl) return null

  return (
    <a
      href={data.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download assignment brief
    </a>
  )
}
