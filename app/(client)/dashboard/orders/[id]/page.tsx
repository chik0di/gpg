import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'
import type { Deliverable, OrderFile } from '@/types/order'
import ReviewTrigger from '@/components/reviews/review-trigger'

export const metadata: Metadata = { title: 'Order Details' }

interface Props { params: { id: string } }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#E8E2D9] last:border-0">
      <span className="text-sm text-[#9CA3AF] shrink-0">{label}</span>
      <span className="text-sm font-semibold text-[#1B2E4B] text-right">{value}</span>
    </div>
  )
}

export default async function OrderDetailPage({ params }: Props) {
  const supabase = createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, deliverables(*), order_files(*)')
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const label  = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status
  const color  = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
  const total  = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`
  const deliverables: Deliverable[] = order.deliverables ?? []
  const files: OrderFile[]          = order.order_files ?? []
  const assignFile                   = files.find((f) => f.file_type === 'assignment')
  const completedFile                = files.find((f) => f.file_type === 'completed')

  // Generate signed URLs server-side for secure file access
  const assignUrl    = assignFile    ? await getSignedUrl(assignFile.file_url)    : null
  const completedUrl = completedFile ? await getSignedUrl(completedFile.file_url) : null

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2E4B]">
            Order <span className="font-mono text-lg">#{order.id.slice(0, 8).toUpperCase()}</span>
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Placed {new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${color}`}>{label}</span>
      </div>

      {/* Download completed work */}
      {order.status === 'completed' && completedUrl && (
        <a
          href={completedUrl}
          download
          className="flex items-center gap-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl px-5 py-4 hover:bg-[#DCFCE7] transition-colors"
        >
          <svg className="w-5 h-5 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div>
            <p className="text-sm font-bold text-[#16A34A]">Download your completed work</p>
            <p className="text-xs text-[#4ADE80] mt-0.5">Your model answer is ready</p>
          </div>
        </a>
      )}

      {/* Download assignment brief */}
      {assignUrl && (
        <a
          href={assignUrl}
          download
          className="flex items-center gap-3 bg-[#F0F9FF] border border-[#93C5FD] rounded-2xl px-5 py-4 hover:bg-[#E0F2FE] transition-colors"
        >
          <svg className="w-5 h-5 text-[#3B82F6] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-[#3B82F6]">Download your assignment brief</p>
            <p className="text-xs text-[#60A5FA] mt-0.5">View the file you uploaded</p>
          </div>
        </a>
      )}

      {/* Order summary card */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9]" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <div className="px-5 py-3 bg-[#F5F0E8] rounded-t-2xl border-b border-[#E8E2D9]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Order details</p>
        </div>
        <div className="px-5">
          <Row label="Subject" value={order.subject_field} />
          <Row label="Academic level" value={order.academic_level} />
          <Row label="Deadline" value={new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
          <Row label="Originality report" value={order.originality_report ? 'Included' : 'Not included'} />
          <Row label="Total paid" value={total} />
        </div>
      </div>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9]" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
          <div className="px-5 py-3 bg-[#F5F0E8] rounded-t-2xl border-b border-[#E8E2D9]">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
              Deliverables ({deliverables.length})
            </p>
          </div>
          <div className="divide-y divide-[#E8E2D9]">
            {deliverables.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-[#1B2E4B] capitalize">{d.type}</p>
                  {d.subtype && <p className="text-xs text-[#9CA3AF] mt-0.5">{d.subtype}</p>}
                  {d.size_band && <p className="text-xs text-[#9CA3AF] mt-0.5">{d.size_band} pages</p>}
                </div>
                <span className="text-sm font-bold text-[#1B2E4B]">
                  £{d.price % 1 === 0 ? d.price : d.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {order.additional_instructions && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-2">Instructions</p>
          <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-wrap">
            {order.additional_instructions}
          </p>
        </div>
      )}

      {/* Review trigger */}
      <ReviewTrigger
        orderId={order.id}
        moduleName={order.module_name}
        isCompleted={order.status === 'completed'}
      />
    </div>
  )
}

async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from('order-files')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
