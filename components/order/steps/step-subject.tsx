import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { OrderFormData } from '@/lib/validations/order'

const SUBJECTS = [
  'Business & Management', 'Law', 'Medicine & Nursing', 'Psychology',
  'History', 'Literature & English', 'Engineering', 'Computer Science',
  'Sociology', 'Economics', 'Education', 'Politics', 'Media & Communications',
  'Biology', 'Chemistry', 'Physics', 'Accounting & Finance', 'Other',
]

const ASSIGNMENT_TYPES = [
  'Essay', 'Dissertation', 'Coursework', 'Report', 'Literature Review',
  'Research Proposal', 'Case Study', 'Presentation', 'Other',
]

const ACADEMIC_LEVELS = ['Undergraduate (Year 1-2)', 'Undergraduate (Year 3)', 'Masters', 'PhD']

interface Props {
  register: UseFormRegister<OrderFormData>
  errors: FieldErrors<OrderFormData>
}

export default function StepSubject({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Tell us about your assignment</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
        <select
          {...register('subject')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select a domain…</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment type</label>
        <select
          {...register('assignment_type')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select type…</option>
          {ASSIGNMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {errors.assignment_type && (
          <p className="mt-1 text-xs text-red-500">{errors.assignment_type.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Academic level</label>
        <select
          {...register('academic_level')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select level…</option>
          {ACADEMIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        {errors.academic_level && (
          <p className="mt-1 text-xs text-red-500">{errors.academic_level.message}</p>
        )}
      </div>
    </div>
  )
}
