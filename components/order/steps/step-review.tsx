import type { UseFormGetValues } from 'react-hook-form'
import type { OrderFormData } from '@/lib/validations/order'

interface Props {
  getValues: UseFormGetValues<OrderFormData>
  isSubmitting: boolean
}

const TIER_RATE: Record<string, number> = { standard: 10, express: 15, urgent: 25 }

export default function StepReview({ getValues, isSubmitting }: Props) {
  const values = getValues()
  const wordCount = values.word_count ?? 0
  const rate = values.deadline_tier ? TIER_RATE[values.deadline_tier] ?? 0 : 0
  const totalPrice = rate * Math.ceil(wordCount / 100)

  const rows: Array<[string, string | number]> = [
    ['Subject', values.subject],
    ['Assignment type', values.assignment_type],
    ['Academic level', values.academic_level],
    ['Word count', `${wordCount} words`],
    ['Deadline tier', values.deadline_tier],
    ['Exact deadline', values.deadline ? new Date(values.deadline).toLocaleString('en-GB') : '—'],
    ['Referencing', values.referencing_style || 'Not specified'],
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Review your order</h2>

      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900 capitalize">{value}</span>
          </div>
        ))}
      </div>

      {values.instructions && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500 mb-1">Instructions</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{values.instructions}</p>
        </div>
      )}

      <div className="bg-brand-600 text-white rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-brand-200 text-sm">Total price</p>
            <p className="text-3xl font-extrabold mt-1">£{totalPrice}</p>
            <p className="text-brand-300 text-xs mt-1">{wordCount} words · {values.deadline_tier} tier</p>
          </div>
          <div className="text-right text-sm text-brand-200">
            <p>Secure checkout</p>
            <p>via Stripe</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        {isSubmitting ? 'Placing order…' : 'Confirm & proceed to payment'}
      </button>
    </div>
  )
}
