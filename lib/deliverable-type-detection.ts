/**
 * File extension patterns that indicate actual code files
 * Only these should trigger a type override from 'written' to 'technical'
 */
const CODE_FILE_EXTENSIONS = [
  // Source code files
  '.py',   // Python
  '.java', // Java
  '.js',   // JavaScript
  '.ts',   // TypeScript
  '.cs',   // C#
  '.cpp',  // C++
  '.c',    // C
  '.h',    // C/C++ header
  '.php',  // PHP
  '.rb',   // Ruby
  '.go',   // Go
  '.rs',   // Rust
  '.swift', // Swift
  '.kt',   // Kotlin
  '.vb',   // Visual Basic
  '.r',    // R
  '.m',    // MATLAB/Objective-C
  '.scala', // Scala

  // Executable files
  '.exe',  // Windows executable
  '.app',  // macOS application
  '.bin',  // Binary
  '.dll',  // Dynamic library

  // Database files
  '.sql',  // SQL script
  '.db',   // Database file
  '.mdb',  // Access database

  // Web files (when referring to code, not content)
  '.html', // HTML
  '.css',  // CSS
  '.jsx',  // React
  '.tsx',  // TypeScript React
  '.vue',  // Vue
]

/**
 * Check if description mentions ONLY code file extensions (indicating actual code deliverable)
 * NOT just mentioning code in a report context
 */
function isCodeFileDeliverable(description: string): boolean {
  if (!description) return false

  const normalized = description.toLowerCase().trim()

  // Must contain at least one file extension
  const hasFileExtension = CODE_FILE_EXTENSIONS.some(ext =>
    normalized.includes(ext)
  )

  if (!hasFileExtension) return false

  // Should NOT contain written deliverable keywords
  // These indicate it's a REPORT ABOUT code, not the code itself
  const writtenKeywords = [
    'report',
    'essay',
    'written',
    'document',
    'analysis',
    'evaluation',
    'reflection',
    'review',
    'critique',
    'discussion',
    'assessment',
    'paper',
    'article',
  ]

  const hasWrittenKeywords = writtenKeywords.some(keyword =>
    normalized.includes(keyword)
  )

  // If it mentions both file extensions AND written keywords,
  // it's probably a report ABOUT code, not code itself
  if (hasWrittenKeywords) return false

  // It has file extensions and no written keywords → likely actual code
  return true
}

/**
 * Correct the deliverable type based on Claude's classification and description content
 *
 * PRIMARY: Trust Claude's type assignment
 * OVERRIDE: Only if Claude said 'written' but description mentions file extensions
 *          with no report/essay keywords (indicating actual code files, not a report about code)
 */
export function correctDeliverableType(
  claudeType: 'written' | 'presentation' | 'technical',
  description: string
): 'written' | 'presentation' | 'technical' {
  // PRIMARY: Trust Claude's classification
  if (claudeType === 'technical' || claudeType === 'presentation') {
    return claudeType
  }

  // NARROW OVERRIDE: Only if Claude said 'written' but it's clearly code files
  // Example: "Python script (.py file) to calculate..." → technical
  // Counter-example: "Written report evaluating Python code" → written (keep it)
  if (claudeType === 'written' && isCodeFileDeliverable(description)) {
    return 'technical'
  }

  // Otherwise trust Claude's classification
  return claudeType
}
