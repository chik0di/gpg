import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import type { OrderFormData } from '@/lib/validations/order'

const DEADLINE_TIERS = [
  { label: 'Standard', description: '10–14 days', rate: 10, value: 'standard' },
  { label: 'Express', description: '3–9 days', rate: 15, value: 'express' },
  { label: 'Urgent', description: '24–48 hours', rate: 25, value: 'urgent' },
]

interface Props {
  register: UseFormRegister<OrderFormData>
  errors: FieldErrors<OrderFormData>
  watch: UseFormWatch<OrderFormData>
}

export default function StepDeadline({ register, errors, watch }: Props) {
  const selectedTier = watch('deadline_tier')
  const wordCount = watch('word_count') ?? 0
  const estimatedPrice = selectedTier
    ? DEADLINE_TIERS.find((t) => t.value === selectedTier)!.rate * Math.ceil(wordCount / 100)
    : null

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Choose your deadline</h2>

      <div className="grid grid-cols-1 gap-3">
        {DEADLINE_TIERS.map((tier) => (
          <label
            key={tier.value}
            className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-colors ${
              selectedTier === tier.value
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                value={tier.value}
                {...register('deadline_tier')}
                className="text-brand-600"
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{tier.label}</p>
                <p className="text-xs text-gray-500">{tier.description}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-900">£{tier.rate}/100w</p>
          </label>
        ))}
      </div>
      {errors.deadline_tier && (
        <p className="text-xs text-red-500">{errors.deadline_tier.message}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Exact deadline</label>
        <input
          type="datetime-local"
          {...register('deadline')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline.message}</p>}
      </div>

      {estimatedPrice !== null && wordCount > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">Estimated price</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">£{estimatedPrice}</p>
          <p className="text-xs text-gray-400 mt-1">{wordCount} words · {selectedTier} tier</p>
        </div>
      )}
    </div>
  )
}
