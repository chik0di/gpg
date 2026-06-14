'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
}

export default function DeleteCompletedButton({ orderId }: Props) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm('Are you sure you want to remove this file?')
    if (!confirmed) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delete-completed`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete file')
        setDeleting(false)
        return
      }

      // Refresh the page to show the empty upload state
      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete file')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-red-500 text-red-500 font-bold text-sm rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {deleting ? 'Deleting...' : 'Remove file'}
    </button>
  )
}
