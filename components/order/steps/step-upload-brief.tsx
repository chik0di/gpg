'use client'

import { useRef, useState } from 'react'

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'
const MAX_MB = 20

// Helper to check if file is an image
function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
         lower.endsWith('.png') || lower.endsWith('.webp')
}

// Helper to check if file is a document
function isDocumentFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx')
}

interface Props {
  onFileSelect: (file: File) => void
  loading: boolean
  uploadError: string | null // File upload failed
  extractionFailed: boolean // File uploaded but extraction returned nothing
  onRetry: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function StepUploadBrief({
  onFileSelect,
  loading,
  uploadError,
  extractionFailed,
  onRetry,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const f = files[0]
    const fileName = f.name

    // Validate file type
    if (!isDocumentFile(fileName) && !isImageFile(fileName)) {
      alert('Please upload a PDF, Word document, or image file (.pdf, .doc, .docx, .jpg, .png, .webp)')
      return
    }

    // Validate file size
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_MB} MB.`)
      return
    }

    setSelectedFile(f)
    onFileSelect(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleRetry() {
    setSelectedFile(null)
    onRetry()
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-1">Upload your brief</h2>
        <p className="text-sm text-[#6B7280]">
          Let our AI read your assignment brief and extract the requirements automatically
        </p>
      </div>

      {/* Loading state */}
      {loading && selectedFile && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-[#E8E2D9]"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-[#E8A020] border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#1B2E4B]">Reading your brief...</p>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Our AI is analyzing {selectedFile.name}
            </p>
          </div>
        </div>
      )}

      {/* SCENARIO A: Upload error - show error and retry button */}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Upload failed</p>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Upload zone - hidden when loading */}
      {!loading && (
        <>
          <div>
            <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
              Assignment brief document
            </label>

            {!selectedFile ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className="relative flex flex-col items-center justify-center gap-3 px-6 py-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-150"
                style={{
                  borderColor: dragging ? '#E8A020' : '#E8E2D9',
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
                    Drop your assignment brief here, or{' '}
                    <span className="text-[#E8A020]">browse</span>
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    PDF, Word, or image files (JPG, PNG) — max {MAX_MB} MB
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
              /* File selected - shown only when not loading */
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
                  <p className="text-sm font-semibold text-[#1B2E4B] truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-red-50 hover:text-red-400 transition-colors"
                  aria-label="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <p className="mt-2 text-xs text-[#9CA3AF]">
              We'll extract deliverables, deadline, and other requirements automatically
            </p>
          </div>

          {/* Help text */}
          <div className="flex items-center justify-center pt-4 border-t border-[#E8E2D9]">
            <p className="text-xs text-[#9CA3AF]">
              Don't have a brief?{' '}
              <a
                href="https://wa.me/447880213838"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#6B7280] hover:text-[#1B2E4B] underline underline-offset-2 transition-colors"
              >
                Contact us on WhatsApp
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
