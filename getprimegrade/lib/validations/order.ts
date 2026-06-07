import { z } from 'zod'

export const orderSchema = z.object({
  subject: z.string().min(1, 'Please select a subject'),
  assignment_type: z.string().min(1, 'Please select an assignment type'),
  academic_level: z.string().min(1, 'Please select your academic level'),
  word_count: z
    .number()
    .min(250, 'Minimum 250 words')
    .max(30000, 'Maximum 30,000 words'),
  title: z.string().optional(),
  instructions: z.string().optional(),
  referencing_style: z.string().optional(),
  deadline_tier: z.enum(['standard', 'express', 'urgent']),
  deadline: z.string().min(1, 'Please provide a deadline'),
})

export type OrderFormData = z.infer<typeof orderSchema>
