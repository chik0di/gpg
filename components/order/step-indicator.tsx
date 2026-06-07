interface StepIndicatorProps {
  steps: string[]
  current: number
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-between mb-10">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current

        return (
          <div key={i} className="flex items-start flex-1">
            {/* Step node */}
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 shrink-0"
                style={{
                  background: done ? '#1B2E4B' : active ? '#E8A020' : '#E8E2D9',
                  color: done || active ? '#fff' : '#9CA3AF',
                }}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="mt-2 text-xs font-semibold text-center leading-tight hidden sm:block"
                style={{ color: active ? '#E8A020' : done ? '#1B2E4B' : '#9CA3AF', maxWidth: '5rem' }}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mt-4 rounded-full transition-all duration-300"
                style={{ background: done ? '#1B2E4B' : '#E8E2D9' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
