import { z } from 'zod'
import type { Deliverable } from '@/types/order-form'
import { getAcademicMultiplierPct, WORDS_PER_PAGE, ORIGINALITY_REPORT_PENCE, WRITTEN_RATE_AI, SLIDE_RATE_AI } from './pricing-pence'

export const PRACTICAL_PRICES_PENCE: Record<string, number> = {
  flowchart: 4000, python: 6500, database: 6500, data_analysis: 6500,
  network: 9500, web_dev: 9500, security: 13000, bi_dashboard: 13000,
}

const deliverableSchema = z.object({
  id: z.string().min(1).max(100), type: z.enum(['written', 'presentation', 'practical']),
  sizeMode: z.enum(['pages', 'words']).default('pages'), quantity: z.number().int().min(0).max(30000).default(0),
  slideBand: z.string().max(100).default(''), slideInputMode: z.enum(['exact', 'between']).default('exact'),
  slideCount: z.number().int().min(0).max(60).default(0), slideMin: z.number().int().min(0).max(60).default(0),
  slideMax: z.number().int().min(0).max(60).default(0), practicalKey: z.string().max(50).default(''),
  // Supplied prices never influence a quote.
  basePrice: z.number().finite().default(0), aiDescription: z.string().max(2000).optional(),
}).superRefine((d, ctx) => {
  if (d.type === 'written' && (d.quantity < 1 || (d.sizeMode === 'pages' && d.quantity > 110)))
    ctx.addIssue({ code: 'custom', message: 'Enter a valid written assignment length.' })
  if (d.type === 'presentation' && (d.slideInputMode === 'exact' ? d.slideCount < 1 : d.slideMin < 1 || d.slideMax < d.slideMin))
    ctx.addIssue({ code: 'custom', message: 'Enter a valid slide count or range.' })
  if (d.type === 'practical' && !Object.hasOwn(PRACTICAL_PRICES_PENCE, d.practicalKey))
    ctx.addIssue({ code: 'custom', message: 'Choose a supported practical deliverable.' })
})

export const checkoutOrderSchema = z.object({
  subjectField: z.string().trim().min(1).max(200), academicLevel: z.enum(['Undergraduate', 'Masters']),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Choose a valid deadline.'),
  deliverables: z.array(deliverableSchema).min(1, 'Add at least one deliverable.').max(6, 'An order can include up to six deliverables.'),
  instructions: z.string().max(20000).default(''), includeOriginalityReport: z.boolean(),
  moduleName: z.string().max(500).nullish(), country: z.string().max(100).optional(),
  academicLevelRaw: z.string().max(200).nullish(), fileName: z.string().max(500).nullish(), briefFileName: z.string().max(500).optional(),
  usedAIExtraction: z.boolean().optional(), briefTempPath: z.string().max(1000).nullish(),
  isOutsideStandardFields: z.boolean().optional(),
  workScope: z.enum(['assignment', 'dissertation', 'thesis', 'uncertain']).optional(),
  selectedCurrency: z.string().max(3).optional(), exchangeRate: z.number().finite().positive().optional(),
})

export function deliverableBasePence(d: Deliverable): number {
  if (d.type === 'written') return (d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)) * WRITTEN_RATE_AI
  if (d.type === 'presentation') return (d.slideInputMode === 'exact' ? d.slideCount : d.slideMax) * SLIDE_RATE_AI
  if (d.type === 'practical') return Object.hasOwn(PRACTICAL_PRICES_PENCE, d.practicalKey) ? PRACTICAL_PRICES_PENCE[d.practicalKey] : 0
  return 0
}

export interface OrderQuote {
  version: 1
  calculatedAt: string
  academicPct: number
  deadlinePct: number
  basePence: number[]
  finalPence: number[]
  subtotalPence: number
  reportPence: number
  totalPence: number
}

export function calculateOrderQuote(data: {academicLevel: string; deadline: string; deliverables: Deliverable[]; includeOriginalityReport: boolean}, now = Date.now()): OrderQuote {
  const days = Math.ceil((new Date(data.deadline).getTime() - now) / 86400000)
  const deadlinePct = days >= 14 ? 100 : days >= 7 ? 120 : days >= 4 ? 150 : 180
  const academicPct = getAcademicMultiplierPct(data.academicLevel)
  const basePence = data.deliverables.map(deliverableBasePence)
  const finalPence = basePence.map(base => Math.round(Math.round(base * academicPct / 100) * deadlinePct / 100))
  const subtotalPence = finalPence.reduce((sum, item) => sum + item, 0)
  const reportPence = data.includeOriginalityReport ? ORIGINALITY_REPORT_PENCE : 0
  return { version: 1, calculatedAt: new Date(now).toISOString(), academicPct, deadlinePct, basePence, finalPence, subtotalPence, reportPence, totalPence: subtotalPence + reportPence }
}

export function assertCheckoutDeadline(deadline: string, now = Date.now()): void {
  if (Math.ceil((new Date(deadline).getTime() - now) / 86400000) < 2) throw new Error('Deadline must be at least 2 days from today.')
}
