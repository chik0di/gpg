/**
 * Technical keywords that indicate a deliverable should be classified as 'technical'
 * rather than 'written' or 'presentation'
 */
const TECHNICAL_KEYWORDS = [
  // Programming & Code
  'source code',
  'source-code',
  'sourcecode',
  'program',
  'programming',
  'script',
  'scripting',
  'executable',
  'application',
  'software',
  'code',
  'coding',
  'implementation',
  'implement',
  'develop',
  'algorithm',
  'pseudocode',
  'pseudo-code',

  // Databases
  'database',
  'sql',
  'mysql',
  'postgresql',
  'mongodb',
  'query',
  'queries',
  'schema',

  // Networks
  'network',
  'networking',
  'router',
  'switch',
  'cisco',
  'packet tracer',
  'gns3',
  'simulation',
  'simulator',
  'topology',

  // Technical artifacts
  'flowchart',
  'flow chart',
  'diagram',
  'erd',
  'entity relationship',
  'circuit',
  'dashboard',
  'model',
  'prototype',
  'wireframe',
  'uml',

  // Development tasks
  'web app',
  'webapp',
  'web application',
  'mobile app',
  'api',
  'rest api',
  'backend',
  'frontend',
  'full stack',
  'fullstack',

  // Specific languages/technologies
  'python',
  'java',
  'javascript',
  'c++',
  'c#',
  'php',
  'ruby',
  'html',
  'css',
  'react',
  'angular',
  'vue',
  'node',
  'django',
  'flask',
]

/**
 * Check if a deliverable description contains technical keywords
 * indicating it should be classified as 'technical' type
 */
export function isTechnicalDeliverable(description: string): boolean {
  if (!description) return false

  const normalized = description.toLowerCase().trim()

  return TECHNICAL_KEYWORDS.some(keyword => normalized.includes(keyword))
}

/**
 * Correct the deliverable type based on Claude's classification and description content
 * Returns the corrected type
 */
export function correctDeliverableType(
  claudeType: 'written' | 'presentation' | 'technical',
  description: string
): 'written' | 'presentation' | 'technical' {
  // If Claude already classified as technical, keep it
  if (claudeType === 'technical') {
    return 'technical'
  }

  // Safety check: scan description for technical keywords
  if (isTechnicalDeliverable(description)) {
    return 'technical'
  }

  // Otherwise trust Claude's classification
  return claudeType
}
