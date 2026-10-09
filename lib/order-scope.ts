export const ASSIGNMENT_SCOPE_MESSAGE = 'We currently support undergraduate and Masters assignments only. Dissertations, theses, and chapters or proposals forming part of them are not accepted. Please contact support if you are unsure before paying.'

export type WorkScope = 'assignment' | 'dissertation' | 'thesis' | 'uncertain'

export function isUnsupportedWorkScope(scope: unknown): boolean {
  return scope === 'dissertation' || scope === 'thesis'
}

// Examine titles and deliverable names, rather than searching every citation or note.
export function hasUnsupportedWorkTitle(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const title = value.replace(/[_-]+/g, ' ').replace(/\.(pdf|docx?|png|jpe?g|webp)$/i, '').trim()
  return /^(?:(?:my|final|draft|masters?|msc|ma|undergraduate|bsc|ba|phd)\s+)*(?:dissertation|thesis)\b/i.test(title)
    || /\b(?:dissertation|thesis)\s+(?:brief|handbook|proposal|chapter|submission|project)\b/i.test(title)
    || /\b(?:chapter|proposal)\s+(?:of|for)\s+(?:my |a |the )?(?:dissertation|thesis)\b/i.test(title)
}

export function assertAssignmentScope(data: {
  workScope?: unknown
  moduleName?: unknown
  fileName?: unknown
  briefFileName?: unknown
  deliverables?: { aiDescription?: unknown }[]
}): void {
  if (isUnsupportedWorkScope(data.workScope) || [data.moduleName, data.fileName, data.briefFileName,
    ...(data.deliverables ?? []).map(d => d.aiDescription)].some(hasUnsupportedWorkTitle)) {
    throw new Error(ASSIGNMENT_SCOPE_MESSAGE)
  }
}
