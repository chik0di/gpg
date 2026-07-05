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
}

export interface OrderFormState {
  subjectField: string
  academicLevel: string
  country: string
  deadline: string
  deliverables: Deliverable[]
  instructions: string
  includeOriginalityReport: boolean
  selectedCurrency: string   // ISO 4217 code, e.g. 'GBP', 'USD'
  exchangeRate: number       // 1 GBP → N selectedCurrency
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
