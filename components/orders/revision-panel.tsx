'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { revisionEligibility, formatRevisionDate, REVISION_STATUS_LABELS, type OrderRevision } from '@/lib/revisions'

interface Props {
  orderId: string
  orderStatus: string
  firstDeliveredAt: string | null
  revisions: OrderRevision[] | null
  admin?: boolean
}

const buttonClass = 'px-4 py-2.5 rounded-xl bg-[#1B2E4B] text-white text-sm font-semibold disabled:opacity-50'
const inputClass = 'w-full border border-[#E8E2D9] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]'

function RevisionActions({ orderId, revision, admin }: { orderId: string; revision: OrderRevision; admin: boolean }) {
  const [response, setResponse] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  async function act(status: string) {
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.set('status', status)
      form.set('response', response)
      if (file) form.set('file', file)
      const res = await fetch(`/api/${admin ? 'admin/' : ''}orders/${orderId}/revisions/${revision.id}`, { method: 'PATCH', ...(admin ? { body: form } : {}) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not update request.')
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update request.') }
    finally { setBusy(false) }
  }
  if (!['requested', 'in_progress'].includes(revision.status)) return null
  return (
    <div className="space-y-3 mt-3">
      {admin ? <>
        <label className="block text-sm font-semibold">Response to client
          <textarea className={`${inputClass} mt-2`} rows={3} maxLength={5000} value={response} onChange={e => setResponse(e.target.value)} placeholder="Optional update, or an explanation if declining" />
        </label>
        {revision.status === 'in_progress' && <label className="block text-sm">Revised work (PDF, Word, PowerPoint, Excel or ZIP; up to 100 MB)
          <input className="block mt-2 text-sm" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>}
        <div className="flex flex-wrap gap-2">
          {revision.status === 'requested' && <button className={buttonClass} disabled={busy} onClick={() => act('in_progress')}>Start revision</button>}
          {revision.status === 'in_progress' && <button className={buttonClass} disabled={busy || !file} onClick={() => act('delivered')}>Deliver revised work</button>}
          <button className={buttonClass} disabled={busy || response.trim().length < 10} onClick={() => act('declined')}>Decline with explanation</button>
        </div>
      </> : revision.status === 'requested' ? <button className={buttonClass} disabled={busy} onClick={() => act('cancelled')}>Cancel request</button> : <p className="text-sm text-[#6B7280]">We are working on your changes.</p>}
      {busy && <p role="status" className="text-sm">Saving…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default function RevisionPanel({ orderId, orderStatus, firstDeliveredAt, revisions, admin = false }: Props) {
  const [instructions, setInstructions] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const eligibility = revisionEligibility(firstDeliveredAt, orderStatus, revisions || [])
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const form = new FormData()
      form.set('instructions', instructions)
      if (attachment) form.set('attachment', attachment)
      const res = await fetch(`/api/orders/${orderId}/revisions`, { method: 'POST', body: form })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not submit request.')
      setInstructions('')
      setAttachment(null)
      if (inputRef.current) inputRef.current.value = ''
      setMessage('Revision requested. We will email you when work starts and when it is ready.')
      router.refresh()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not submit request.') }
    finally { setBusy(false) }
  }
  return (
    <section className="bg-white rounded-2xl border border-[#E8E2D9] p-5 space-y-4">
      <h2 className="text-lg font-bold text-[#1B2E4B]">Revisions</h2>
      {revisions === null ? <p role="alert" className="text-sm text-[#6B7280]">Revision requests are temporarily unavailable. Please contact support.</p> : <>
        <p className="text-sm font-semibold">{eligibility.remaining} of 3 free revisions remaining</p>
        {eligibility.expiresAt && <p className="text-sm text-[#6B7280]">Request changes by {formatRevisionDate(eligibility.expiresAt)}. Requests submitted in time remain valid while we complete them.</p>}
        {!admin && (eligibility.reason ? <p className="text-sm text-[#6B7280]">{eligibility.reason}</p> : <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-[#6B7280]">Group your feedback into one request. Changes must relate to your original brief. One round is used when revised work is delivered.</p>
          <label className="block text-sm font-semibold">What needs changing?
            <textarea required minLength={10} maxLength={5000} rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} className={`${inputClass} mt-2`} placeholder="Describe the changes and refer to pages or sections where possible." />
          </label>
          <label className="block text-sm">Feedback attachment (optional; PDF, Word or image; up to 20 MB)
            <input ref={inputRef} className="block mt-2 text-sm" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setAttachment(e.target.files?.[0] || null)} />
          </label>
          <button disabled={busy} className={buttonClass}>{busy ? 'Submitting…' : 'Request a revision'}</button>
        </form>)}
        {message && <p role="status" className="text-sm">{message}</p>}
        {revisions.map((r, index) => <article key={r.id} className="border-t border-[#E8E2D9] pt-4 space-y-2">
          <div className="flex justify-between gap-3"><h3 className="text-sm font-bold">Request {revisions.length - index}</h3><span className="text-sm font-semibold text-[#1B2E4B]">{REVISION_STATUS_LABELS[r.status]}</span></div>
          <p className="text-xs text-[#6B7280]">{formatRevisionDate(r.created_at)}</p>
          <p className="text-sm whitespace-pre-wrap break-words">{r.instructions}</p>
          {r.attachment_url && <a className="block text-sm text-[#1B2E4B] underline" href={r.attachment_url} target="_blank" rel="noopener noreferrer">Download feedback: {r.attachment_name}</a>}
          {r.admin_response && <div className="bg-[#F5F0E8] rounded-xl p-3"><p className="text-xs font-bold mb-1">Response</p><p className="text-sm whitespace-pre-wrap break-words">{r.admin_response}</p></div>}
          {r.delivered_at && <p className="text-xs text-[#6B7280]">Delivered {formatRevisionDate(r.delivered_at)}. Download from the delivery history.</p>}
          <RevisionActions orderId={orderId} revision={r} admin={admin} />
        </article>)}
        {admin && revisions.length === 0 && <p className="text-sm text-[#6B7280]">No revision requests yet.</p>}
      </>}
    </section>
  )
}
