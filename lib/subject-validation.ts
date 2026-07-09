import { SUBJECT_GROUPS } from './pricing'

/**
 * Get all standard subject field names
 */
export function getStandardSubjects(): string[] {
  return SUBJECT_GROUPS.flatMap(group => group.subjects)
}

/**
 * Check if a subject is in our standard predefined list
 */
export function isStandardSubject(subject: string | null): boolean {
  if (!subject) return false

  const standard = getStandardSubjects()
  const normalized = subject.toLowerCase().trim()

  return standard.some(s => s.toLowerCase() === normalized)
}
