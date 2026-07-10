import { SUBJECT_GROUPS } from './pricing'

/**
 * Keyword mapping for fuzzy subject field matching
 * Each standard field has an array of keywords to check for
 */
const SUBJECT_KEYWORDS: Record<string, string[]> = {
  'Computer Science': [
    'computer science',
    'computing',
    'computer systems',
    'computational'
  ],
  'Information Technology': [
    'information technology',
    'it ',
    'information systems',
    'information and communication'
  ],
  'Cybersecurity': [
    'cyber',
    'security',
    'network security',
    'information security',
    'penetration',
    'ethical hacking'
  ],
  'Networking & Communications': [
    'network',
    'networking',
    'communications',
    'telecoms',
    'wireless',
    'routing',
    'switching'
  ],
  'Software Engineering': [
    'software',
    'software engineering',
    'software development',
    'software design'
  ],
  'Artificial Intelligence & Machine Learning': [
    'artificial intelligence',
    'machine learning',
    'ai',
    'deep learning',
    'neural',
    'data mining',
    'nlp',
    'natural language'
  ],
  'Data Science': [
    'data science',
    'data analysis',
    'data analytics',
    'statistics',
    'statistical',
    'big data',
    'data visuali' // catches visualization/visualisation
  ],
  'Business Administration': [
    'business',
    'management',
    'administration',
    'organisational',
    'organizational',
    'entrepreneurship'
  ],
  'Project Management': [
    'project management',
    'project planning',
    'agile',
    'scrum',
    'prince2',
    'pmp'
  ],
  'Finance & Accounting': [
    'finance',
    'accounting',
    'financial',
    'economics',
    'investment',
    'banking',
    'audit'
  ],
  'Marketing': [
    'marketing',
    'digital marketing',
    'branding',
    'advertising',
    'market research',
    'social media marketing'
  ]
}

/**
 * Get all standard subject field names
 */
export function getStandardSubjects(): string[] {
  return SUBJECT_GROUPS.flatMap(group => group.subjects)
}

/**
 * Check if a subject is in our standard predefined list using fuzzy keyword matching
 * Returns true if ANY keyword from ANY field appears in the subject string (case-insensitive)
 * Only returns false if NO keywords from ANY field match
 */
export function isStandardSubject(subject: string | null): boolean {
  if (!subject) return false

  const normalized = subject.toLowerCase().trim()

  // Check if any keyword from any field appears in the subject string
  for (const [fieldName, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return true // Found a matching keyword - this is a standard field
      }
    }
  }

  // No keywords matched - this is outside standard fields
  return false
}
