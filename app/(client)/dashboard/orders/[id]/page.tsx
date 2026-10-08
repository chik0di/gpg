import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import StatusBadge from '@/components/shared/status-badge'
import type { Deliverable, OrderFile } from '@/types/order'
import DownloadWithReview from '@/components/orders/download-with-review'

import RevisionPanel from '@/components/orders/revision-panel'
import DeliveryHistory from '@/components/orders/delivery-history'
import { revisionsForOrder } from '@/lib/revision-server'

export const metadata: Metadata = { title: 'Order Details' }

interface Props { params: { id: string } }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#E8E2D9] last:border-0">
      <span className="text-sm text-[#64748B] shrink-0">{label}</span>
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

  // ========================================
  // DEBUG: Log exact order status for review popup debugging
  // ========================================
  console.log('========================================')
  console.log('[OrderDetailPage] 📋 ORDER STATUS DEBUG')
  console.log('[OrderDetailPage] Order ID:', params.id)
  console.log('[OrderDetailPage] Order status (raw):', JSON.stringify(order.status))
  console.log('[OrderDetailPage] Order status length:', order.status?.length)
  console.log('[OrderDetailPage] Order status (trimmed):', JSON.stringify(order.status?.trim()))
  console.log('[OrderDetailPage] Order status bytes:', (order.status || '').split('').map((c: string) => c.charCodeAt(0)))
  console.log('[OrderDetailPage] Status === "completed":', order.status === 'completed')
  console.log('[OrderDetailPage] Status (lowercase) === "completed":', order.status?.toLowerCase() === 'completed')
  console.log('[OrderDetailPage] Status (trimmed) === "completed":', order.status?.trim() === 'completed')
  console.log('========================================')

  const total  = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`
  const deliverables: Deliverable[] = order.deliverables ?? []
  const files: OrderFile[]          = order.order_files ?? []
  const assignFile                   = files.find((f) => f.file_type === 'assignment')
  const completedFiles = files.filter(f => f.file_type === 'completed').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const completedFile = completedFiles[0]

  // Generate signed URLs server-side for secure file access
  const assignUrl    = assignFile    ? await getSignedUrl(assignFile.file_url)    : null
  const completedUrl = completedFile ? await getSignedUrl(completedFile.file_url) : null

  const revisions = await revisionsForOrder(order.id)
  const deliveryFiles = order.first_delivered_at || order.status === 'completed' ? await Promise.all(completedFiles.map(async f => ({ ...f, url: await getSignedUrl(f.file_url) }))) : []

  // ========================================
  // DEBUG: Log what will be passed to ReviewTrigger
  // ========================================
  const isCompletedForReview = order.status === 'completed'
  console.log('========================================')
  console.log('[OrderDetailPage] 🎯 REVIEW TRIGGER PROPS')
  console.log('[OrderDetailPage] Will pass to ReviewTrigger:')
  console.log('[OrderDetailPage]   - orderId:', order.id)
  console.log('[OrderDetailPage]   - moduleName:', order.module_name)
  console.log('[OrderDetailPage]   - isCompleted:', isCompletedForReview)
  console.log('[OrderDetailPage] Raw status comparison:', order.status, '===', 'completed', '→', order.status === 'completed')
  console.log('========================================')


  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#1B2E4B] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E4B]">
            Order <span className="font-mono text-lg">#{order.id.slice(0, 8).toUpperCase()}</span>
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Placed {new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Download completed work - with review trigger on click */}
      {(order.first_delivered_at || order.status === 'completed') && completedUrl && (
        <DownloadWithReview
          orderId={order.id}
          moduleName={order.module_name}
          downloadUrl={completedUrl}
        />
      )}

      <DeliveryHistory files={deliveryFiles} />
      <RevisionPanel orderId={order.id} orderStatus={order.status} firstDeliveredAt={order.first_delivered_at ?? null} revisions={revisions} />

      {/* Download assignment brief */}
      {assignUrl && (
        <a
          href={assignUrl}
          download
          className="flex items-center gap-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-5 py-4 hover:bg-[#EBF0F6] transition-colors"
        >
          <svg className="w-5 h-5 text-[#1B2E4B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-[#1B2E4B]">Download your assignment brief</p>
            <p className="text-xs text-[#64748B] mt-0.5">View the file you uploaded</p>
          </div>
        </a>
      )}

      {/* Order summary card */}
      <div className="ui-card">
        <div className="px-5 py-4 border-b border-[#E8E2D9]">
          <p className="text-sm font-semibold text-[#1B2E4B]">Order details</p>
        </div>
        <div className="px-5">
          <Row label="Subject" value={order.module_name || order.subject_field} />
          <Row label="Academic level" value={order.academic_level} />
          <Row label="Deadline" value={new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
          <Row label="Originality report" value={order.originality_report ? 'Included' : 'Not included'} />
          <Row label="Total paid" value={total} />
        </div>
      </div>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div className="ui-card">
          <div className="px-5 py-4 border-b border-[#E8E2D9]">
            <p className="text-sm font-semibold text-[#1B2E4B]">
              Deliverables ({deliverables.length})
            </p>
          </div>
          <div className="divide-y divide-[#E8E2D9]">
            {deliverables.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-[#1B2E4B] capitalize">{d.type}</p>
                  {d.subtype && <p className="text-xs text-[#64748B] mt-0.5">{d.subtype}</p>}
                  {d.size_band && <p className="text-xs text-[#64748B] mt-0.5">{d.size_band} pages</p>}
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
        <div className="ui-card p-5">
          <p className="text-sm font-semibold text-[#1B2E4B] mb-2">Instructions</p>
          <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-wrap">
            {order.additional_instructions}
          </p>
        </div>
      )}

      {/* Review trigger removed - now triggered by download button click only */}
    </div>
  )
}

async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from('order-files')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
