export const REVISION_LIMIT = 3
export const REVISION_WINDOW_DAYS = 14
export const REVISION_STATUS_LABELS = {
  requested: 'Requested', in_progress: 'In progress', delivered: 'Delivered',
  declined: 'Declined', cancelled: 'Cancelled',
} as const

export interface OrderRevision {
  id: string
  order_id: string
  instructions: string
  status: keyof typeof REVISION_STATUS_LABELS
  admin_response: string | null
  attachment_name: string | null
  attachment_path: string | null
  attachment_url?: string | null
  created_at: string
  delivered_at: string | null
}

export function formatRevisionDate(value: string) {
  return `${new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`
}

export function revisionEligibility(firstDeliveredAt: string | null, status: string, revisions: OrderRevision[], now = Date.now()) {
  const used = revisions.filter(r => r.status === 'delivered').length
  const remaining = Math.max(0, REVISION_LIMIT - used)
  const active = revisions.find(r => r.status === 'requested' || r.status === 'in_progress')
  const expiresAt = firstDeliveredAt ? new Date(new Date(firstDeliveredAt).getTime() + REVISION_WINDOW_DAYS * 86400000).toISOString() : null
  const reason = !firstDeliveredAt || status !== 'completed' ? 'You can request revisions after your work is delivered.'
    : active ? 'Your current revision request must finish before you submit another.'
    : remaining === 0 ? 'All three free revisions have been used.'
    : expiresAt && now >= new Date(expiresAt).getTime() ? 'The 14-day revision request window has closed.' : null
  return { used, remaining, active, expiresAt, reason }
}
