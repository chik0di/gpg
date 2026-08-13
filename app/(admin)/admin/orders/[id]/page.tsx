import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'
import StatusUpdater from '@/components/admin/status-updater'
import FileUploader from '@/components/admin/file-uploader'
import DeleteCompletedButton from '@/components/admin/delete-completed-button'
import { getClientDisplayName, getClientInitial } from '@/lib/utils/client-name'

export const metadata: Metadata = { title: 'Admin — Order Detail' }

interface Props { params: { id: string } }

function Row({ label, value, secondary }: { label: string; value: string; secondary?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#E8E2D9] last:border-0">
      <span className="text-sm text-[#9CA3AF] shrink-0 w-36">{label}</span>
      <div className="text-right">
        <div className="text-sm font-semibold text-[#1B2E4B]">{value}</div>
        {secondary && (
          <div className="text-xs text-[#9CA3AF] mt-1">{secondary}</div>
        )}
      </div>
    </div>
  )
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      profiles ( first_name, last_name, email ),
      deliverables ( * ),
      order_files ( * )
    `)
    .eq('id', params.id)
    .single() as {
      data: {
        id: string; status: string; total_amount: number; academic_level: string; user_id: string
        module_name: string | null; subject_field: string; deadline: string; additional_instructions: string | null
        originality_report: boolean; stripe_payment_intent_id: string | null; created_at: string
        is_outside_standard_fields: boolean | null
        profiles: { first_name: string | null; last_name: string | null; email: string } | null
        deliverables: Array<{ id: string; type: string; subtype: string | null; size_band: string | null; price: number }>
        order_files: Array<{ id: string; file_url: string; file_type: string }>
      } | null
    }

  if (!order) notFound()

  const statusLabel   = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status
  const statusColor   = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
  const client        = order.profiles
  const clientName    = await getClientDisplayName(order.user_id, client)
  const clientInitial = await getClientInitial(order.user_id, client)
  const total         = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`
  const deadline      = new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })
  const placed        = new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })
  const shortId       = order.id.slice(0, 8).toUpperCase()
  const assignFile    = order.order_files.find((f) => f.file_type === 'assignment')
  const completedFile = order.order_files.find((f) => f.file_type === 'completed')

  // Generate signed URLs server-side
  const assignUrl    = assignFile    ? await getSignedUrl(assignFile.file_url)    : null
  const completedUrl = completedFile ? await getSignedUrl(completedFile.file_url) : null

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Order queue
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2E4B]">
            Order <span className="font-mono text-lg">#{shortId}</span>
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Placed {placed}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Outside standard fields banner */}
      {order.is_outside_standard_fields && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Outside Standard Subject Areas</p>
            <p className="text-sm text-amber-800 mt-1">
              This order is outside our typical subject areas. Review the brief carefully before starting work. If unable to complete, issue a full refund within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Client info */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Client</p>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: '#1B2E4B' }}
          >
            {clientInitial}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1B2E4B]">{clientName}</p>
            <a
              href={`mailto:${client?.email}`}
              className="text-sm text-[#E8A020] hover:text-[#C4861A] transition-colors"
            >
              {client?.email}
            </a>
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <div className="bg-[#F5F0E8] px-5 py-3 border-b border-[#E8E2D9]">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Order Details</p>
        </div>
        <div className="px-5">
          <Row label="Domain" value={order.subject_field} secondary={order.module_name} />
          <Row label="Academic level" value={order.academic_level} />
          <Row label="Deadline" value={deadline} />
          <Row label="Total paid" value={total} />
          <Row label="Originality report" value={order.originality_report ? 'Included' : 'Not included'} />
          {order.stripe_payment_intent_id && (
            <Row label="Payment ref" value={order.stripe_payment_intent_id.slice(0, 24) + '…'} />
          )}
        </div>
      </div>

      {/* Deliverables */}
      {order.deliverables.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
          <div className="bg-[#F5F0E8] px-5 py-3 border-b border-[#E8E2D9]">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
              Deliverables ({order.deliverables.length})
            </p>
          </div>
          <div className="divide-y divide-[#E8E2D9]">
            {order.deliverables.map((d) => {
              let detailLine = ''

              if (d.type === 'presentation' && d.subtype) {
                // Parse new format: 'exact:18' or 'between:15:20'
                const parts = d.subtype.split(':')
                if (parts[0] === 'exact' && parts[1]) {
                  detailLine = `${parts[1]} slides`
                } else if (parts[0] === 'between' && parts[1] && parts[2]) {
                  detailLine = `${parts[1]}–${parts[2]} slides (charged at ${parts[2]})`
                } else {
                  // Legacy format fallback
                  detailLine = d.subtype
                }
              } else if (d.type === 'written' && d.size_band) {
                detailLine = `${d.size_band} pages`
              } else if (d.type === 'practical' && d.subtype) {
                detailLine = d.subtype
              }

              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-[#1B2E4B] capitalize">{d.type}</p>
                    {detailLine && <p className="text-xs text-[#9CA3AF] mt-0.5">{detailLine}</p>}
                  </div>
                  <span className="text-sm font-bold text-[#1B2E4B]">
                    £{d.price % 1 === 0 ? d.price : d.price.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      {order.additional_instructions && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Client Instructions</p>
          <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-wrap">
            {order.additional_instructions}
          </p>
        </div>
      )}

      {/* Assignment document */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Assignment Brief</p>
        {assignUrl ? (
          <a
            href={assignUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-[#1B2E4B] text-[#1B2E4B] font-bold text-sm rounded-xl hover:bg-[#1B2E4B] hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download assignment brief
          </a>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No assignment document uploaded by client.</p>
        )}
      </div>

      {/* Upload completed work */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Completed Work</p>
        {completedUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <a
                href={completedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A] font-bold text-sm rounded-xl hover:bg-[#DCFCE7] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                View uploaded work
              </a>
              <DeleteCompletedButton orderId={order.id} />
            </div>
            <p className="text-xs text-[#9CA3AF]">Replace by uploading a new file below.</p>
            <FileUploader orderId={order.id} />
          </div>
        ) : (
          <FileUploader orderId={order.id} />
        )}
      </div>

      {/* Status update */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Update Status</p>
        <StatusUpdater orderId={order.id} currentStatus={order.status} />
        {order.status !== 'completed' && (
          <p className="text-xs text-[#9CA3AF] mt-3">
            Setting status to <strong>Completed</strong> will automatically email the client with a link to download their work.
          </p>
        )}
      </div>
    </div>
  )
}

async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from('order-files')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
