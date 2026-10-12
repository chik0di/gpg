import type Stripe from 'stripe'
import { supabaseAdmin as db } from '@/lib/supabase/admin'
import { verifyPaidCheckout } from '@/lib/checkout-integrity'
import { sendOrderConfirmation, sendAdminNewOrderAlert } from '@/lib/resend'
import { WORDS_PER_PAGE, PRACTICAL_ITEMS } from '@/lib/pricing'

export class CheckoutBusyError extends Error {}

/** Both callers use the same immutable checkout, atomic order creation and retry lease. */
export async function fulfilPayment(pi: Stripe.PaymentIntent, origin: string, legacyData?: unknown, legacyFile?: File | null) {
  if (pi.status !== 'succeeded') throw new Error('Payment has not succeeded.')
  const userId = pi.metadata.userId
  if (!userId || pi.currency !== 'gbp') throw new Error('Invalid payment account or currency.')
  const found = await db.from('orders').select('id, user_id, fulfilment_completed_at, confirmation_sent_at, admin_alert_sent_at')
    .eq('stripe_payment_intent_id', pi.id).maybeSingle()
  if (found.error) throw new Error('Could not check order recovery status.')
  if (found.data && found.data.user_id !== userId) throw new Error('Payment account mismatch.')
  if (found.data?.fulfilment_completed_at && found.data.confirmation_sent_at && found.data.admin_alert_sent_at)
    return { orderId: found.data.id, notificationPending: false }

  let pending: { order_data: unknown; file_data: string | null; user_id: string | null; checkout_key?: string | null } | null = null
  if (pi.metadata.pendingOrderId) {
    const result = await db.from('pending_orders').select('order_data, file_data, user_id, checkout_key').eq('id', pi.metadata.pendingOrderId).maybeSingle()
    if (result.error) throw new Error('Could not load accepted checkout.')
    pending = result.data
  }
  if (pi.metadata.orderHash && (!pending || pending.user_id !== userId)) throw new Error('Accepted checkout could not be found.')
  const { orderData: data, quote } = verifyPaidCheckout(pi, pending?.order_data ?? legacyData, userId)
  const rows = data.deliverables.map((d, index) => ({
    type: d.type,
    subtype: d.type === 'presentation' ? (d.slideInputMode === 'exact' ? `exact:${d.slideCount}` : `between:${d.slideMin}:${d.slideMax}`) : d.type === 'practical' ? d.practicalKey : null,
    size_band: d.type === 'written' ? String(d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)) : null,
    price: quote.finalPence[index] / 100, price_pence: quote.finalPence[index], extracted_by_ai: data.usedAIExtraction || false,
    ai_description: d.aiDescription || null, raw_quantity: d.quantity || null,
    quantity_type: d.type === 'written' ? d.sizeMode : d.type === 'presentation' ? 'slides' : null,
  }))
  const created = await db.rpc('fulfil_paid_order', { p_payment_id: pi.id, p_order: {
    user_id: userId, total_amount: quote.totalPence / 100, pricing_snapshot: quote,
    academic_level: data.academicLevel, academic_level_raw: data.academicLevelRaw || null,
    country: data.country || 'United Kingdom', subject_field: data.subjectField, deadline: data.deadline,
    additional_instructions: data.instructions || null, originality_report: data.includeOriginalityReport,
    module_name: data.moduleName || null, is_outside_standard_fields: data.isOutsideStandardFields || false,
  }, p_deliverables: rows })
  if (created.error || !created.data) throw new Error('Could not save order and deliverables.')
  const orderId: string = created.data
  const lease = new Date().toISOString()
  const claimed = await db.from('orders').update({ checkout_processing_at: lease }).eq('id', orderId)
    .or(`checkout_processing_at.is.null,checkout_processing_at.lt.${new Date(Date.now() - 5 * 60000).toISOString()}`)
    .select('id, fulfilment_completed_at, confirmation_sent_at, admin_alert_sent_at').maybeSingle()
  if (claimed.error) throw new Error('Could not claim order fulfilment.')
  if (!claimed.data) throw new CheckoutBusyError('Your order is being confirmed. Please wait.')
  try {
    if (!claimed.data.fulfilment_completed_at) {
      const files = await db.from('order_files').select('id').eq('order_id', orderId).eq('file_type', 'assignment').limit(1)
      if (files.error) throw new Error('Could not check assignment brief.')
      if (!files.data?.length) {
        let binary: Buffer | null = null
        let name = data.briefFileName || data.fileName || 'assignment.pdf'
        let type = 'application/octet-stream'
        if (data.usedAIExtraction && data.briefTempPath) {
          const file = await db.storage.from('order-files').download(data.briefTempPath)
          if (file.error || !file.data) throw new Error('Could not recover assignment brief.')
          binary = Buffer.from(await file.data.arrayBuffer()); type = file.data.type || type
        } else if (pending?.file_data) {
          const file = JSON.parse(pending.file_data) as { data: string; name: string; type: string }
          binary = Buffer.from(file.data, 'base64'); name = file.name; type = file.type || type
        } else if (!pi.metadata.orderHash && legacyFile?.size) {
          binary = Buffer.from(await legacyFile.arrayBuffer()); name = legacyFile.name; type = legacyFile.type
        }
        if (binary) {
          const filePath = `${orderId}/brief/${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          // Retrying an interrupted upload writes the same accepted brief to the same path.
          const uploaded = await db.storage.from('order-files').upload(filePath, binary, { contentType: type, upsert: true })
          if (uploaded.error) throw new Error('Could not store assignment brief.')
          const linked = await db.from('order_files').insert({ order_id: orderId, file_type: 'assignment', file_url: filePath })
          if (linked.error) throw new Error('Could not link assignment brief.')
        } else if (data.fileName || data.briefFileName || data.briefTempPath) {
          throw new Error('Assignment attachment needs recovery.')
        }
      }
      const completed = await db.from('orders').update({ fulfilment_completed_at: new Date().toISOString() }).eq('id', orderId).eq('checkout_processing_at', lease)
      if (completed.error) throw new Error('Could not record completed fulfilment.')
    }
    const profile = await db.from('profiles').select('first_name, last_name, email').eq('id', userId).single()
    let notificationPending = !!profile.error || !profile.data?.email
    if (!notificationPending) {
      const p = profile.data!
      const items = data.deliverables.map((d, index) => ({ finalPrice: quote.finalPence[index] / 100,
        description: d.type === 'written' ? `Written assignment (${d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)} pages)`
          : d.type === 'presentation' ? `Presentation (${d.slideInputMode === 'exact' ? d.slideCount : `${d.slideMin}–${d.slideMax}, charged at ${d.slideMax}`} slides)`
          : `Practical work: ${PRACTICAL_ITEMS.find(item => item.key === d.practicalKey)?.label ?? d.practicalKey}`,
      }))
      const notifications = [
        { field: 'confirmation_sent_at', sent: claimed.data.confirmation_sent_at, send: () => sendOrderConfirmation({ origin, to: p.email, firstName: p.first_name ?? '', orderId,
          moduleName: data.moduleName, subjectField: data.subjectField, academicLevel: data.academicLevel, deadline: data.deadline,
          totalAmount: quote.totalPence / 100, deliverableItems: items, originalityReportPrice: quote.reportPence ? quote.reportPence / 100 : null,
          isOutsideStandardFields: data.isOutsideStandardFields, idempotencyKey: `order-confirmation-${orderId}` }) },
        { field: 'admin_alert_sent_at', sent: claimed.data.admin_alert_sent_at, send: () => sendAdminNewOrderAlert({ origin, orderId,
          clientName: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Customer', clientEmail: p.email,
          moduleName: data.moduleName, subjectField: data.subjectField, academicLevel: data.academicLevel, deadline: data.deadline,
          totalAmount: quote.totalPence / 100, deliverableSummary: items.map(item => item.description).join(', '),
          instructions: data.instructions, idempotencyKey: `admin-new-order-${orderId}` }) },
      ]
      for (const n of notifications) {
        if (n.sent) continue
        try {
          const result = await n.send()
          if (result.error) throw new Error('Notification rejected')
          const saved = await db.from('orders').update({ [n.field]: new Date().toISOString() }).eq('id', orderId).eq('checkout_processing_at', lease)
          if (saved.error) throw new Error('Could not record notification')
        } catch { notificationPending = true; console.error('[fulfilment] Notification pending:', orderId, n.field) }
      }
    }
    if (!notificationPending && pi.metadata.pendingOrderId) {
      const done = await db.from('pending_orders').update({ fulfilled_at: new Date().toISOString(), file_data: null })
        .eq('user_id', userId).or(`id.eq.${pi.metadata.pendingOrderId}${pending?.checkout_key ? `,id.eq.${pending.checkout_key}` : ''}`)
      if (done.error) throw new Error('Could not record checkout completion.')
    }
    return { orderId, notificationPending }
  } finally {
    await db.from('orders').update({ checkout_processing_at: null }).eq('id', orderId).eq('checkout_processing_at', lease)
  }
}
