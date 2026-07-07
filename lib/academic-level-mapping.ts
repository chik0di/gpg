/**
 * Maps various academic level terms found in briefs to our three pricing tiers
 */

export type PricingTier = 'A-Level / College' | 'Undergraduate' | 'Masters'

// A-Level/College tier (0.8× multiplier)
const COLLEGE_TIER_TERMS = [
  'hnd', 'hnc', 'ond', 'btec level 3', 'btec level 4', 'btec level 5',
  'foundation degree', 'a-level', 'a level', 'access to he', 'access course',
  'college', 'further education', 'level 3', 'level 4', 'level 5',
]

// Undergraduate tier (1× multiplier)
const UNDERGRADUATE_TIER_TERMS = [
  'undergraduate', 'bachelor', 'bsc', 'ba', 'beng', 'llb',
  'year 1', 'year 2', 'year 3', 'first year', 'second year', 'third year',
  'university', 'degree', 'honours',
]

// Masters tier (1.3× multiplier)
const MASTERS_TIER_TERMS = [
  'masters', 'master', 'msc', 'ma', 'mba', 'mphil', 'mres', 'meng',
  'postgraduate', 'post graduate', 'phd', 'doctorate', 'doctoral',
]

/**
 * Map an extracted academic level term to a pricing tier
 * Returns both the tier for pricing and the original raw term
 */
export function mapAcademicLevel(rawTerm: string | null): {
  tier: PricingTier
  rawTerm: string | null
} {
  if (!rawTerm) {
    return { tier: 'Undergraduate', rawTerm: null }
  }

  const normalized = rawTerm.toLowerCase().trim()

  // Check masters tier first (most specific)
  if (MASTERS_TIER_TERMS.some(term => normalized.includes(term))) {
    return { tier: 'Masters', rawTerm }
  }

  // Check college tier
  if (COLLEGE_TIER_TERMS.some(term => normalized.includes(term))) {
    return { tier: 'A-Level / College', rawTerm }
  }

  // Check undergraduate tier
  if (UNDERGRADUATE_TIER_TERMS.some(term => normalized.includes(term))) {
    return { tier: 'Undergraduate', rawTerm }
  }

  // Default to undergraduate if no match
  return { tier: 'Undergraduate', rawTerm }
}

/**
 * Get the display label for academic level adjustment in order summary
 * Uses the raw term if available, otherwise falls back to tier
 */
export function getAcademicLevelDisplayLabel(
  tier: string,
  rawTerm: string | null,
  multiplier: number
): string | null {
  if (multiplier === 1) return null // No adjustment for undergraduate

  const displayTerm = rawTerm || tier
  const pct = Math.round(Math.abs(multiplier - 1) * 100)

  return multiplier > 1
    ? `${displayTerm} +${pct}%`
    : `${displayTerm} −${pct}%`
}

/**
 * Get academic level display label for order summary from OrderFormState
 * Checks sessionStorage for raw term if available
 */
export function getAcademicLevelAdjLabelWithRaw(academicLevel: string): string | null {
  // Try to get raw term from sessionStorage
  const rawTerm = typeof window !== 'undefined'
    ? sessionStorage.getItem('gpg_academic_level_raw')
    : null

  // Get multiplier
  const { getAcademicMultiplier } = require('@/lib/pricing')
  const mult = getAcademicMultiplier(academicLevel)

  return getAcademicLevelDisplayLabel(academicLevel, rawTerm, mult)
}
