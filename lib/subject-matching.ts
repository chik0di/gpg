import { SUBJECT_GROUPS } from './pricing'

/**
 * Get all available subject field names as a flat array
 */
export function getAllSubjects(): string[] {
  return SUBJECT_GROUPS.flatMap(group => group.subjects)
}

/**
 * Match an extracted subject string to one of our predefined subject fields
 * Returns the clean matched field name, or the original string if no match
 */
export function matchSubjectField(extractedSubject: string | null): string | null {
  if (!extractedSubject) return null

  const allSubjects = getAllSubjects()
  const normalized = extractedSubject.toLowerCase().trim()

  // First try exact match (case-insensitive)
  for (const subject of allSubjects) {
    if (subject.toLowerCase() === normalized) {
      return subject
    }
  }

  // Try partial match - if extracted contains the subject name
  for (const subject of allSubjects) {
    if (normalized.includes(subject.toLowerCase())) {
      return subject
    }
  }

  // Try reverse - if subject name contains extracted
  for (const subject of allSubjects) {
    if (subject.toLowerCase().includes(normalized)) {
      return subject
    }
  }

  // Handle compound subjects like "Computer Science / Programming"
  // Check if any part matches
  if (normalized.includes('/') || normalized.includes(' and ') || normalized.includes(',')) {
    const parts = normalized
      .split(/[\/,]| and /)
      .map(p => p.trim())
      .filter(Boolean)

    for (const part of parts) {
      for (const subject of allSubjects) {
        if (subject.toLowerCase().includes(part) || part.includes(subject.toLowerCase())) {
          return subject // Return first match
        }
      }
    }
  }

  // No match found - return original extracted value
  return extractedSubject
}
