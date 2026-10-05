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
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      if (admin && result.notification?.accepted === false) {
        setError('The revision was saved, but the client email could not be sent. Check the server logs for the notification error. Do not deliver the revision again.')
      }
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update request.') }
    finally { setBusy(false) }
  }
  if (!['requested', 'in_progress'].includes(revision.status)) {
    return error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null
  }
  return (
    <div className="space-y-3 mt-3">
      {admin ? <>
        <label className="block text-sm font-semibold">Response to client
          <textarea className={`${inputClass} mt-2`} rows={3} maxLength={5000} value={response} onChange={e => setResponse(e.target.value)} placeholder="Optional update, or an explanation if declining" />
        </label>
        {revision.status === 'in_progress' && <div className="space-y-2">
          <p className="text-sm font-semibold text-[#1B2E4B]">Revised work</p>
          <p className="text-xs text-[#6B7280]">PDF, Word, PowerPoint, Excel or ZIP; up to 100 MB</p>
          <input ref={fileInputRef} className="hidden" aria-label="Revised work file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} />
          {file ? <div className="flex items-center gap-3 rounded-xl border border-[#E8E2D9] bg-[#F5F0E8] px-4 py-3">
            <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#1B2E4B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1B2E4B]" title={file.name}>{file.name}</p>
              <p className="text-xs text-[#6B7280]">{file.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</p>
            </div>
            <button type="button" aria-label="Remove revised work file" title="Remove file" disabled={busy} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#6B7280] hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A020] disabled:opacity-50" onClick={() => {
              setFile(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}>
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div> : <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#9CA3AF] bg-[#F5F0E8] px-4 py-4 text-sm font-semibold text-[#1B2E4B] transition-colors hover:border-[#E8A020] hover:bg-[#FDF8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A020] disabled:opacity-50">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L8 8m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
            Choose revised work file
          </button>}
        </div>}
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#1B2E4B]">Feedback attachment <span className="font-normal text-[#6B7280]">(optional)</span></p>
            <p className="text-xs text-[#6B7280]">PDF, Word or image; up to 20 MB</p>
            <input ref={inputRef} className="hidden" aria-label="Feedback attachment" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" disabled={busy} onChange={e => setAttachment(e.target.files?.[0] || null)} />
            {attachment ? <div className="flex items-center gap-3 rounded-xl border border-[#E8E2D9] bg-[#F5F0E8] px-4 py-3">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#1B2E4B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1B2E4B]" title={attachment.name}>{attachment.name}</p>
                <p className="text-xs text-[#6B7280]">{attachment.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(attachment.size / 1024))} KB` : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}</p>
              </div>
              <button type="button" aria-label="Remove feedback attachment" title="Remove attachment" disabled={busy} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#6B7280] hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A020] disabled:opacity-50" onClick={() => {
                setAttachment(null)
                if (inputRef.current) inputRef.current.value = ''
              }}>
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div> : <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#9CA3AF] bg-[#F5F0E8] px-4 py-4 text-sm font-semibold text-[#1B2E4B] transition-colors hover:border-[#E8A020] hover:bg-[#FDF8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A020] disabled:opacity-50">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L8 8m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
              Choose feedback file
            </button>}
          </div>
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
