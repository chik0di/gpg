export type DeliverableType = 'written' | 'presentation' | 'practical' | ''
export type SizeMode = 'pages' | 'words'

export interface Deliverable {
  id: string
  type: DeliverableType
  // Written
  sizeMode: SizeMode
  quantity: number   // pages or words depending on sizeMode
  // Presentation
  slideBand: string       // Deprecated - kept for backward compat during migration
  slideInputMode: 'exact' | 'between'  // 'exact' or 'between'
  slideCount: number      // For 'exact' mode
  slideMin: number        // For 'between' mode
  slideMax: number        // For 'between' mode
  // Practical
  practicalKey: string  // PracticalKey
  // Computed base price (before academic/deadline multipliers)
  basePrice: number
  // AI extraction metadata
  aiDescription?: string  // Claude's description for this deliverable
}

export interface OrderFormState {
  moduleName?: string        // Exact module name extracted from brief (e.g. 'Strategic Financial Management')
  subjectField: string
  academicLevel: string
  country: string
  deadline: string
  deliverables: Deliverable[]
  instructions: string
  includeOriginalityReport: boolean
  selectedCurrency: string   // ISO 4217 code, e.g. 'GBP', 'USD'
  exchangeRate: number       // 1 GBP → N selectedCurrency
  briefFileName?: string     // Name of uploaded brief file (for AI extraction flow)
  isOutsideStandardFields?: boolean  // True if subject is not in our standard list
  quoteGeneratedAt?: string  // ISO timestamp when order summary was first shown (for quote expiry)
}

export function makeDeliverable(): Deliverable {
  return {
    id: Math.random().toString(36).slice(2),
    type: '',
    sizeMode: 'pages',
    quantity: 0,
    slideBand: '',
    slideInputMode: 'exact',
    slideCount: 0,
    slideMin: 0,
    slideMax: 0,
    practicalKey: '',
    basePrice: 0,
  }
}

export const INITIAL_FORM_STATE: OrderFormState = {
  subjectField: '',
  academicLevel: '',
  country: 'United Kingdom',
  deadline: '',
  deliverables: [makeDeliverable()],
  instructions: '',
  includeOriginalityReport: false,
  selectedCurrency: 'GBP',
  exchangeRate: 1,
}
