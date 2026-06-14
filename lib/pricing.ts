export const WORDS_PER_PAGE = 275

// ── Subject groups ────────────────────────────────────────────────────────
export const SUBJECT_GROUPS = [
  {
    group: 'Technology & Computing',
    subjects: [
      'Computer Science',
      'Information Technology',
      'Cybersecurity',
      'Networking & Communications',
      'Software Engineering',
      'Artificial Intelligence & Machine Learning',
      'Data Science',
    ],
  },
  {
    group: 'Business & Management',
    subjects: [
      'Business Administration',
      'Project Management',
      'Finance & Accounting',
      'Marketing',
    ],
  },
]

// ── Academic level multipliers ────────────────────────────────────────────
export const ACADEMIC_LEVELS = [
  { label: 'A-Level / College', multiplier: 0.8 },
  { label: 'Undergraduate', multiplier: 1 },
  { label: 'Masters', multiplier: 1.3 },
] as const

export type AcademicLevelLabel = (typeof ACADEMIC_LEVELS)[number]['label']

export function getAcademicMultiplier(level: string): number {
  return ACADEMIC_LEVELS.find((l) => l.label === level)?.multiplier ?? 1
}

// ── Deadline multipliers ──────────────────────────────────────────────────
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function getDeadlineMultiplier(dateStr: string): number {
  if (!dateStr) return 1
  const days = daysUntil(dateStr)
  if (days >= 14) return 1
  if (days >= 7) return 1.2
  if (days >= 4) return 1.5
  return 1.8
}

export function getDeadlineBandLabel(dateStr: string): string {
  if (!dateStr) return '—'
  const days = daysUntil(dateStr)
  if (days >= 14) return '14+ days'
  if (days >= 7) return '7–13 days'
  if (days >= 4) return '4–6 days'
  return '2–3 days'
}

// ── Written pricing ───────────────────────────────────────────────────────
export function calcWrittenPrice(pages: number): number {
  if (!pages || pages <= 0) return 0
  if (pages <= 2) return 10
  if (pages <= 5) return pages * 5
  if (pages <= 10) return pages * 4.5
  if (pages <= 20) return pages * 4
  return pages * 3.5
}

export function writtenBandLabel(pages: number): string {
  if (!pages || pages <= 0) return ''
  if (pages <= 2) return 'Up to 2 pages — flat rate'
  if (pages <= 5) return '3–5 pages — £5/page'
  if (pages <= 10) return '6–10 pages — £4.50/page'
  if (pages <= 20) return '11–20 pages — £4/page'
  return '20+ pages — £3.50/page'
}

// ── Presentation pricing ──────────────────────────────────────────────────
export const SLIDE_BANDS = [
  { key: 'up_to_10', label: 'Up to 10 slides', price: 25 },
  { key: '10_to_20', label: '10–20 slides', price: 45 },
  { key: '20_to_30', label: '20–30 slides', price: 65 },
  { key: '30_plus', label: '30+ slides', price: 85 },
] as const

export type SlideBandKey = (typeof SLIDE_BANDS)[number]['key']

export function getSlideBandPrice(key: string): number {
  return SLIDE_BANDS.find((b) => b.key === key)?.price ?? 0
}

// ── Practical pricing ─────────────────────────────────────────────────────
export const PRACTICAL_ITEMS = [
  { key: 'python', label: 'Python / Programming', price: 55 },
  { key: 'web_dev', label: 'Web Development', price: 75 },
  { key: 'network', label: 'Network Simulation (Cisco, GNS3)', price: 65 },
  { key: 'database', label: 'Database Design', price: 55 },
  { key: 'data_analysis', label: 'Data Analysis (Excel, SPSS, R)', price: 50 },
  { key: 'security', label: 'Security Assessment', price: 70 },
  { key: 'flowchart', label: 'Flowchart / Pseudocode', price: 45 },
  { key: 'bi_dashboard', label: 'Power BI / Tableau Dashboard', price: 70 },
] as const

export type PracticalKey = (typeof PRACTICAL_ITEMS)[number]['key']

export function getPracticalPrice(key: string): number {
  return PRACTICAL_ITEMS.find((p) => p.key === key)?.price ?? 0
}

// ── Adjustment labels ─────────────────────────────────────────────────────

// Returns e.g. "Masters level +30%" or "A-Level / College −20%", null for Undergraduate
export function getAcademicLevelAdjLabel(academicLevel: string): string | null {
  const mult = getAcademicMultiplier(academicLevel)
  if (mult === 1) return null
  const pct = Math.round(Math.abs(mult - 1) * 100)
  return mult > 1 ? `${academicLevel} level +${pct}%` : `${academicLevel} −${pct}%`
}

// Returns e.g. "Urgency premium +50%", null when no premium
export function getDeadlinePremiumLabel(dateStr: string): string | null {
  if (!dateStr) return null
  const mult = getDeadlineMultiplier(dateStr)
  if (mult === 1) return null
  const pct = Math.round((mult - 1) * 100)
  return `Urgency premium +${pct}%`
}

// Returns an urgency warning message for 2–6 day deadlines, null otherwise
export function getUrgencyWarning(dateStr: string): string | null {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  if (days <= 3) return 'This deadline attracts an urgency premium — your final price will include a +80% adjustment, shown in the order summary.'
  if (days <= 6) return 'This deadline attracts an urgency premium — your final price will include a +50% adjustment, shown in the order summary.'
  return null
}

// ── Order total calculation ───────────────────────────────────────────────
export const ORIGINALITY_REPORT_PRICE = 8

export function calcOrderTotal({
  deliverableSubtotal,
  academicLevel,
  deadline,
  includeOriginalityReport,
  applyFirstOrderDiscount = false,
  discountPercent = 10,
}: {
  deliverableSubtotal: number
  academicLevel: string
  deadline: string
  includeOriginalityReport: boolean
  applyFirstOrderDiscount?: boolean
  discountPercent?: number
}): {
  adjusted: number
  total: number
  levelMult: number
  deadlineMult: number
  discountAmount?: number
} {
  const levelMult = getAcademicMultiplier(academicLevel)
  const deadlineMult = getDeadlineMultiplier(deadline)

  // Apply discount to base subtotal BEFORE multipliers
  let baseSubtotal = deliverableSubtotal
  let discountAmount = 0

  if (applyFirstOrderDiscount && discountPercent > 0) {
    discountAmount = deliverableSubtotal * (discountPercent / 100)
    baseSubtotal = deliverableSubtotal - discountAmount
  }

  const adjusted = baseSubtotal * levelMult * deadlineMult
  const total = adjusted + (includeOriginalityReport ? ORIGINALITY_REPORT_PRICE : 0)

  return { adjusted, total, levelMult, deadlineMult, discountAmount }
}
