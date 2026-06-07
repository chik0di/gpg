'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploader({ orderId }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const inputRef              = useRef<HTMLInputElement>(null)
  const router                = useRouter()

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    const res  = await fetch(`/api/admin/orders/${orderId}/upload`, {
      method: 'POST',
      body:   formData,
    })
    const json = await res.json()

    if (!res.ok) {
      setMsg({ type: 'err', text: json.error ?? 'Upload failed.' })
    } else {
      setMsg({ type: 'ok', text: 'File uploaded successfully.' })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#E8E2D9] rounded-xl text-sm font-semibold text-[#9CA3AF] hover:border-[#E8A020] hover:text-[#E8A020] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Select completed work file
        </button>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3 border rounded-xl"
          style={{ borderColor: '#1B2E4B', background: '#F5F0E8' }}
        >
          <svg className="w-5 h-5 text-[#1B2E4B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1B2E4B] truncate">{file.name}</p>
            <p className="text-xs text-[#9CA3AF]">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-[#9CA3AF] hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.xls,.xlsx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2.5 bg-[#E8A020] hover:bg-[#C4861A] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60"
        >
          {loading ? 'Uploading…' : 'Upload completed work'}
        </button>
      )}

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
