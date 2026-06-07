'use client'

import { useRef, useState } from 'react'

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt'
const MAX_MB = 50

interface Props {
  file: File | null
  instructions: string
  errors: Record<string, string>
  onFileChange: (file: File | null) => void
  onInstructionsChange: (val: string) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function StepUpload({
  file,
  instructions,
  errors,
  onFileChange,
  onInstructionsChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const f = files[0]
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_MB} MB.`)
      return
    }
    onFileChange(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-1">Upload &amp; instructions</h2>
        <p className="text-sm text-[#6B7280]">
          Share your assignment brief so we can match it exactly.
        </p>
      </div>

      {/* File upload zone */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
          Assignment document
          <span className="ml-1 text-red-400">*</span>
        </label>

        {!file ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="relative flex flex-col items-center justify-center gap-3 px-6 py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-150"
            style={{
              borderColor: dragging ? '#E8A020' : errors.file ? '#FCA5A5' : '#E8E2D9',
              background: dragging ? '#FDF3DC' : '#FDFAF6',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: '#F5F0E8' }}
            >
              <svg className="w-6 h-6 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1B2E4B]">
                Drop your file here, or{' '}
                <span className="text-[#E8A020]">browse</span>
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                PDF, Word, PowerPoint, Excel, ZIP — max {MAX_MB} MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        ) : (
          /* File selected */
          <div
            className="flex items-center gap-4 p-4 border rounded-2xl"
            style={{ borderColor: '#1B2E4B', background: '#F5F0E8' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#1B2E4B' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1B2E4B] truncate">{file.name}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = '' }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-red-50 hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {errors.file && (
          <p className="mt-1.5 text-xs text-red-500">{errors.file}</p>
        )}

        <p className="mt-2 text-xs text-[#9CA3AF]">
          Your file will be renamed to include your name and order number upon upload.
        </p>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
          Additional instructions
          <span className="ml-2 text-xs font-normal text-[#9CA3AF]">optional</span>
        </label>
        <textarea
          rows={5}
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Any specific requirements, marking criteria, preferred sources, formatting notes, or anything else we should know…"
          className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
          style={{ color: '#1A1A2E' }}
        />
      </div>
    </div>
  )
}
