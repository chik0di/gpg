import { SUBJECT_GROUPS } from './pricing'

/**
 * Single-word generic term fallback lookup
 * Maps common single-word module names directly to domains
 *
 * CRITICAL: Only include words that are SPECIFIC to a domain.
 * Removed: 'engineering', 'development', 'data', 'computing', 'technology' - these are too generic
 */
const SINGLE_WORD_FALLBACK: Record<string, string> = {
  'programming': 'Computer Science',
  'coding': 'Computer Science',
  'software': 'Software Engineering',
  'networking': 'Networking & Communications',
  'networks': 'Networking & Communications',
  'cybersecurity': 'Cybersecurity',
  'finance': 'Finance & Accounting',
  'accounting': 'Finance & Accounting',
  'marketing': 'Marketing',
  'statistics': 'Data Science',
  'analytics': 'Data Science',
  'ai': 'Artificial Intelligence & Machine Learning',
  'it': 'Information Technology',
}

/**
 * Keyword mapping for fuzzy domain classification
 * Maps keywords to our exact 11 standard domain fields from SUBJECT_GROUPS
 *
 * CRITICAL: Keywords must be SPECIFIC to the academic discipline. Generic terms like
 * "analysis", "data", "code", "system", "research", "development" appear in briefs
 * across ALL academic fields and must NOT be used for domain matching.
 *
 * Only use domain-specific terms that uniquely identify a field.
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'Computer Science': [
    'computer science', 'comp sci',
    'programming', 'programmer', 'coding', 'coder',
    'app development', 'web development', 'mobile development',
    'python', 'java', 'javascript', 'c++', 'c#', 'vb', 'visual basic', 'php', 'ruby',
    'algorithm', 'algorithms', 'data structure', 'data structures',
    'object oriented', 'oop', 'procedural', 'functional programming',
    'event driven', 'debugging', 'debug', 'ide', 'development environment',
    'compiler', 'interpreter', 'syntax', 'variable',
    'theory of computation', 'discrete math', 'computational thinking'
  ],
  'Information Technology': [
    'information technology', 'it systems', 'it infrastructure', 'systems administration',
    'helpdesk', 'it management', 'information systems'
  ],
  'Cybersecurity': [
    'cybersecurity', 'cyber security', 'information security', 'infosec',
    'network security', 'penetration testing', 'ethical hacking', 'security audit',
    'cryptography', 'malware', 'vulnerability'
  ],
  'Networking & Communications': [
    'networking', 'telecoms', 'telecommunications',
    'routing', 'switching', 'cisco', 'wireless', 'lan', 'wan', 'tcp/ip',
    'network architecture', 'network design'
  ],
  'Software Engineering': [
    'software engineering', 'software development', 'software design',
    'sdlc', 'agile', 'scrum', 'devops', 'version control', 'git',
    'software architecture', 'design patterns'
  ],
  'Artificial Intelligence & Machine Learning': [
    'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
    'ai', 'ml', 'nlp', 'natural language processing', 'computer vision',
    'reinforcement learning', 'supervised learning', 'unsupervised learning'
  ],
  'Data Science': [
    'data science', 'data analytics', 'big data',
    'statistical analysis', 'data mining', 'data visualization',
    'predictive analytics', 'business intelligence', 'tableau', 'power bi'
  ],
  'Business Administration': [
    'business administration', 'business management', 'mba',
    'management research', 'business research', 'research methods',
    'research methodology', 'academic research',
    'organisational behaviour', 'organizational behaviour',
    'organisational behavior', 'organizational behavior',
    'supply chain', 'operations management', 'strategic management',
    'business strategy', 'business development',
    'human resources', 'hr management', 'human resource management',
    'change management', 'leadership', 'entrepreneurship'
  ],
  'Project Management': [
    'project management', 'project planning', 'pmp', 'prince2',
    'agile project', 'waterfall', 'gantt', 'risk management',
    'stakeholder management', 'resource planning'
  ],
  'Finance & Accounting': [
    'financial', 'accounting', 'bookkeeping', 'audit',
    'investment', 'banking', 'portfolio', 'tax', 'financial reporting',
    'balance sheet', 'income statement', 'cash flow', 'acca', 'cfa'
  ],
  'Marketing': [
    'marketing', 'digital marketing', 'social media marketing', 'seo',
    'branding', 'advertising', 'market research', 'consumer behavior',
    'marketing strategy', 'content marketing', 'email marketing'
  ],
}

/**
 * Get all available subject field names as a flat array
 */
export function getAllSubjects(): string[] {
  return SUBJECT_GROUPS.flatMap(group => group.subjects)
}

/**
 * Match a single text string against domain keywords
 * Returns { domain, score } or null if no match
 */
function matchTextToDomain(text: string | null): { domain: string; score: number } | null {
  if (!text) return null

  const normalized = text.toLowerCase().trim()
  if (!normalized) return null

  console.log('[matchTextToDomain] Matching text:', JSON.stringify(normalized))

  const allSubjects = getAllSubjects()

  // First try exact match (case-insensitive) - highest confidence
  for (const subject of allSubjects) {
    if (subject.toLowerCase() === normalized) {
      console.log('[matchTextToDomain] Exact match found:', subject)
      return { domain: subject, score: 1000 }
    }
  }

  // Check single-word fallback for generic terms (high confidence)
  // Only applies if text is a single word
  const words = normalized.split(/\s+/)
  if (words.length === 1 && SINGLE_WORD_FALLBACK[normalized]) {
    const fallbackDomain = SINGLE_WORD_FALLBACK[normalized]
    console.log('[matchTextToDomain] Single-word fallback match:', fallbackDomain)
    return { domain: fallbackDomain, score: 900 }
  }

  // Try fuzzy keyword matching - check if any domain keywords appear in the text
  let bestMatch: { domain: string; score: number } | null = null
  const matchedKeywords: string[] = []

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        // Weight longer keywords more heavily (more specific)
        score += keyword.length
        matchedKeywords.push(`${keyword} (${domain})`)
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { domain, score }
    }
  }

  if (matchedKeywords.length > 0) {
    console.log('[matchTextToDomain] Matched keywords:', matchedKeywords)
  }

  if (bestMatch && bestMatch.score > 0) {
    console.log('[matchTextToDomain] Best keyword match:', bestMatch.domain, 'score:', bestMatch.score)
    return bestMatch
  }

  // Try partial match - if text contains the subject name
  for (const subject of allSubjects) {
    if (normalized.includes(subject.toLowerCase())) {
      console.log('[matchTextToDomain] Partial match (text contains subject):', subject)
      return { domain: subject, score: 50 }
    }
  }

  // Try reverse - if subject name contains text
  for (const subject of allSubjects) {
    if (subject.toLowerCase().includes(normalized)) {
      console.log('[matchTextToDomain] Reverse match (subject contains text):', subject)
      return { domain: subject, score: 40 }
    }
  }

  // Handle compound subjects like "Computer Science / Programming"
  if (normalized.includes('/') || normalized.includes(' and ') || normalized.includes(',')) {
    const parts = normalized
      .split(/[\/,]| and /)
      .map(p => p.trim())
      .filter(Boolean)

    console.log('[matchTextToDomain] Trying compound parts:', parts)

    for (const part of parts) {
      // Try keyword matching on each part
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        for (const keyword of keywords) {
          if (part.includes(keyword.toLowerCase())) {
            console.log('[matchTextToDomain] Compound part match:', keyword, '→', domain)
            return { domain, score: 30 }
          }
        }
      }
    }
  }

  console.log('[matchTextToDomain] No match found, returning null')
  return null
}

/**
 * Match multiple context sources to find the best domain classification
 * Uses confidence scoring to select the most reliable match
 *
 * @param contexts - Array of context strings to try matching (e.g. cleaned module name, subject area)
 * @returns The best matched domain name, or null if no confident match found
 */
export function matchSubjectField(...contexts: Array<string | null | undefined>): string | null {
  console.log('[matchSubjectField] Starting match with contexts:', contexts.map(c => JSON.stringify(c)))
  let bestMatch: { domain: string; score: number } | null = null

  // Try matching each context and keep the highest score
  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i]
    if (!context) {
      console.log(`[matchSubjectField] Context ${i} is null/undefined, skipping`)
      continue
    }

    console.log(`[matchSubjectField] Trying context ${i}:`, JSON.stringify(context))
    const match = matchTextToDomain(context)
    if (match && (!bestMatch || match.score > bestMatch.score)) {
      console.log(`[matchSubjectField] New best match from context ${i}:`, match.domain, 'score:', match.score)
      bestMatch = match
    }
  }

  const finalResult = bestMatch?.domain || null
  console.log('[matchSubjectField] Final result:', JSON.stringify(finalResult))
  return finalResult
}