import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM    = 'Get Prime Grade <admin@getprimegrade.com>'
const ADMIN   = 'admin@getprimegrade.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getprimegrade.com'

// ── HTML base template ────────────────────────────────────────────────────────

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E8E2D9;">
    <div style="background:#1B2E4B;padding:24px 32px;">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">GetPrimeGrade</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#F5F0E8;border-top:1px solid #E8E2D9;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">GetPrimeGrade &middot; <a href="mailto:admin@getprimegrade.com" style="color:#9CA3AF;">admin@getprimegrade.com</a></p>
      <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF;">All content is provided for educational reference purposes only.</p>
    </div>
  </div>
</body>
</html>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1B2E4B;">${text}</h1>`
}
function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4B5563;">${text}</p>`
}
function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#9CA3AF;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#1B2E4B;font-weight:600;">${value}</td>
  </tr>`
}
function table(rows: string) {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`
}
function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#E8A020;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px;margin:16px 0;">${text}</a>`
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #E8E2D9;margin:24px 0;">`
}

// ── Email: client order confirmation ─────────────────────────────────────────

export async function sendOrderConfirmation(params: {
  to: string
  firstName: string
  orderId: string
  subjectField: string
  academicLevel: string
  deadline: string
  totalAmount: number
  deliverableSummary: string  // e.g. "Written (5 pages), Presentation (10 slides)"
  isOutsideStandardFields?: boolean
}) {
  const {
    to, firstName, orderId, subjectField,
    academicLevel, deadline, totalAmount, deliverableSummary,
    isOutsideStandardFields = false,
  } = params

  const deadlineFormatted = new Date(deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })
  const totalFormatted    = `£${totalAmount % 1 === 0 ? totalAmount : totalAmount.toFixed(2)}`
  const shortId           = orderId.slice(0, 8).toUpperCase()

  const outsideFieldsNotice = isOutsideStandardFields
    ? p('<strong>Please note:</strong> As your assignment falls outside our standard subject areas, our team will review your brief within 24 hours to confirm we can complete your work. If we are unable to proceed for any reason, you will receive a full refund immediately — no questions asked.')
    : ''

  const html = base(`
    ${h1(`Order confirmed, ${firstName || 'there'}!`)}
    ${p('Your order has been received and our team will get started right away. You\'ll hear from us as soon as your work is ready.')}
    ${outsideFieldsNotice}
    ${divider()}
    ${table(
      row('Order ID', `#${shortId}`) +
      row('Subject', subjectField) +
      row('Academic level', academicLevel) +
      row('Deadline', deadlineFormatted) +
      row('Deliverables', deliverableSummary) +
      row('Total paid', totalFormatted)
    )}
    ${divider()}
    ${btn('View my orders', `${APP_URL}/dashboard/orders`)}
    ${p('<span style="font-size:13px;color:#9CA3AF;">Your order includes 3 free revisions. If you have any questions, reply to this email.</span>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Order confirmed — #${shortId}`,
    html,
  })
}

// ── Email: admin new order alert ──────────────────────────────────────────────

export async function sendAdminNewOrderAlert(params: {
  orderId: string
  clientName: string
  clientEmail: string
  subjectField: string
  academicLevel: string
  deadline: string
  totalAmount: number
  deliverableSummary: string
  instructions?: string | null
}) {
  const {
    orderId, clientName, clientEmail, subjectField,
    academicLevel, deadline, totalAmount, deliverableSummary, instructions,
  } = params

  const deadlineFormatted = new Date(deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })
  const totalFormatted    = `£${totalAmount % 1 === 0 ? totalAmount : totalAmount.toFixed(2)}`
  const shortId           = orderId.slice(0, 8).toUpperCase()

  const html = base(`
    ${h1(`New order — #${shortId}`)}
    ${p(`<strong>${clientName}</strong> &lt;${clientEmail}&gt; has placed a new order.`)}
    ${divider()}
    ${table(
      row('Order ID', `#${shortId}`) +
      row('Client', `${clientName} &lt;${clientEmail}&gt;`) +
      row('Subject', subjectField) +
      row('Academic level', academicLevel) +
      row('Deadline', deadlineFormatted) +
      row('Deliverables', deliverableSummary) +
      row('Total paid', totalFormatted)
    )}
    ${instructions ? `${divider()}<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1B2E4B;">Client instructions</p><p style="margin:0;font-size:13px;color:#4B5563;white-space:pre-wrap;background:#F5F0E8;padding:12px 16px;border-radius:8px;">${instructions}</p>` : ''}
    ${divider()}
    ${btn('View order in admin', `${APP_URL}/admin/orders/${orderId}`)}
  `)

  return resend.emails.send({
    from: FROM,
    to:   ADMIN,
    subject: `New order — #${shortId} from ${clientName}`,
    html,
  })
}

// ── Email: contact form enquiry ───────────────────────────────────────────────

export async function sendContactEnquiry(params: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const { name, email, subject, message } = params

  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = base(`
    ${h1('New contact form enquiry')}
    ${table(
      row('From', `${name} &lt;${email}&gt;`) +
      row('Subject', subject)
    )}
    ${divider()}
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1B2E4B;">Message</p>
    <p style="margin:0;font-size:13px;color:#4B5563;white-space:pre-wrap;background:#F5F0E8;padding:12px 16px;border-radius:8px;">${escaped}</p>
    ${divider()}
    ${p('<span style="font-size:13px;color:#9CA3AF;">Reply directly to this email to respond to the sender.</span>')}
  `)

  return resend.emails.send({
    from:     FROM,
    to:       ADMIN,
    replyTo:  email,
    subject:  `Contact form: ${subject}`,
    html,
  })
}

// ── Email: client order in progress ───────────────────────────────────────────

export async function sendOrderInProgressEmail(params: {
  to: string
  firstName: string
  orderId: string
  subjectField: string
  deadline: string
}) {
  const { to, firstName, orderId, subjectField, deadline } = params
  const shortId = orderId.slice(0, 8).toUpperCase()
  const deadlineFormatted = new Date(deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })

  const html = base(`
    ${h1(`We've started working on your order, ${firstName || 'there'}!`)}
    ${p(`Your order <strong>#${shortId}</strong> (${subjectField}) is now in progress. Our team is working on it and we'll deliver before your deadline on <strong>${deadlineFormatted}</strong>.`)}
    ${divider()}
    ${btn('View order status', `${APP_URL}/dashboard/orders/${orderId}`)}
    ${divider()}
    ${p('<span style="font-size:13px;color:#9CA3AF;">You\'ll receive an email as soon as your work is ready for download. If you have any questions in the meantime, just reply to this email.</span>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `We've started on your order — #${shortId}`,
    html,
  })
}

// ── Email: client work completed ──────────────────────────────────────────────

export async function sendOrderCompletedEmail(params: {
  to: string
  firstName: string
  orderId: string
  subjectField: string
}) {
  const { to, firstName, orderId, subjectField } = params
  const shortId = orderId.slice(0, 8).toUpperCase()

  const html = base(`
    ${h1(`Your work is ready, ${firstName || 'there'}!`)}
    ${p(`Great news — your order <strong>#${shortId}</strong> (${subjectField}) has been completed and is now available to download from your dashboard.`)}
    ${divider()}
    ${btn('Download my work', `${APP_URL}/dashboard/orders/${orderId}`)}
    ${divider()}
    ${p('<span style="font-size:13px;color:#9CA3AF;">Remember: you have 3 free revisions if anything needs adjusting. Just reply to this email or request a revision from your dashboard within 14 days.</span>')}
  `)

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your work is ready — order #${shortId}`,
    html,
  })
}
