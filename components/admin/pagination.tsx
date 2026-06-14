'use client'

interface Props {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | 'ellipsis')[] = []

  // Always show first page
  pages.push(1)

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  // Show pages around current
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm font-semibold text-[#6B7280] hover:bg-[#F5F0E8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, idx) => {
          if (page === 'ellipsis') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-[#9CA3AF]">
                ...
              </span>
            )
          }

          const isActive = page === currentPage

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="w-10 h-10 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: isActive ? '#1B2E4B' : 'transparent',
                color: isActive ? '#fff' : '#6B7280',
              }}
            >
              {page}
            </button>
          )
        })}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm font-semibold text-[#6B7280] hover:bg-[#F5F0E8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  )
}
