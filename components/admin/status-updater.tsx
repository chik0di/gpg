'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
]

interface Props {
  orderId: string
  currentStatus: string
}

export default function StatusUpdater({ orderId, currentStatus }: Props) {
  const [status, setStatus]   = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function handleSave() {
    if (status === currentStatus) return
    setLoading(true)
    setMsg(null)

    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    const json = await res.json()

    if (!res.ok) {
      setMsg({ type: 'err', text: json.error ?? 'Failed to update status.' })
    } else {
      setMsg({
        type: 'ok',
        text: status === 'completed'
          ? 'Status updated and client notified by email.'
          : 'Status updated.',
      })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex-1 px-3.5 py-2.5 border border-[#E8E2D9] rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E]"
        >
          {STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || status === currentStatus}
          className="px-5 py-2.5 bg-[#1B2E4B] hover:bg-[#16253d] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>

      {msg && (
        <p
          className="text-xs font-medium px-3 py-2 rounded-lg"
          style={{
            background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
            color:      msg.type === 'ok' ? '#16A34A' : '#DC2626',
          }}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}
