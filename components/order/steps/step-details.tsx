import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { OrderFormData } from '@/lib/validations/order'

interface Props {
  register: UseFormRegister<OrderFormData>
  errors: FieldErrors<OrderFormData>
}

export default function StepDetails({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Assignment details</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Word count</label>
        <input
          type="number"
          min={250}
          max={30000}
          step={250}
          {...register('word_count', { valueAsNumber: true })}
          placeholder="e.g. 2500"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.word_count && <p className="mt-1 text-xs text-red-500">{errors.word_count.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title / topic (optional)</label>
        <input
          type="text"
          {...register('title')}
          placeholder="e.g. The impact of social media on mental health"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instructions & requirements</label>
        <textarea
          {...register('instructions')}
          rows={5}
          placeholder="Paste your assignment brief, marking criteria, or any specific instructions here…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        {errors.instructions && (
          <p className="mt-1 text-xs text-red-500">{errors.instructions.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Referencing style</label>
        <select
          {...register('referencing_style')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select style…</option>
          {['Harvard', 'APA', 'Vancouver', 'OSCOLA', 'Chicago', 'MLA', 'Oxford', 'Not required'].map(
            (s) => <option key={s} value={s}>{s}</option>
          )}
        </select>
      </div>
    </div>
  )
}
