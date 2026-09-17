/**
 * Citation Formatter Verification Test
 * Tests all 15 combinations (3 source types × 5 styles)
 */

import {
  formatCitation,
  resetVancouverCounter,
  type BookSource,
  type WebsiteSource,
  type JournalSource,
} from './lib/citation-formatter'

// Sample sources for testing
const bookSource: BookSource = {
  type: 'book',
  authors: ['Smith, John', 'Jones, Amara'],
  title: 'Machine Learning Fundamentals',
  year: '2024',
  publisher: 'Academic Press',
  place: 'London',
}

const websiteSource: WebsiteSource = {
  type: 'website',
  authors: ['Brown, Thomas'],
  organisation: 'OpenAI',
  title: 'Introduction to Neural Networks',
  year: '2023',
  url: 'https://example.com/article',
  dateAccessed: '15 September 2024',
}

const journalSource: JournalSource = {
  type: 'journal',
  authors: ['Wilson, Karen', 'Davis, Michael', 'Taylor, Rebecca'],
  title: 'Advances in Deep Learning',
  journalName: 'Journal of AI Research',
  year: '2024',
  volume: '45',
  issue: '3',
  pageRange: '123-145',
  doi: '10.1234/jair.2024.123',
}

console.log('='.repeat(80))
console.log('CITATION FORMATTER VERIFICATION TEST')
console.log('Testing all 15 combinations (3 source types × 5 styles)')
console.log('='.repeat(80))
console.log()

const styles = ['APA', 'MLA', 'Chicago', 'Harvard', 'Vancouver'] as const
const sources = [
  { name: 'Book', source: bookSource },
  { name: 'Website', source: websiteSource },
  { name: 'Journal', source: journalSource },
]

for (const style of styles) {
  console.log('━'.repeat(80))
  console.log(`${style} STYLE`)
  console.log('━'.repeat(80))
  console.log()

  // Reset Vancouver counter for each style
  resetVancouverCounter()

  for (const { name, source } of sources) {
    const citation = formatCitation(source, style)

    console.log(`${name.toUpperCase()}:`)
    console.log()
    console.log(`In-text:`)
    console.log(`  ${citation.inText}`)
    console.log()
    console.log(`Full Reference:`)
    console.log(`  ${citation.fullReference}`)
    console.log()
    console.log(`Sort Key: "${citation.sortKey}"`)
    if (citation.vancouverNumber) {
      console.log(`Vancouver Number: ${citation.vancouverNumber}`)
    }
    console.log()
  }
}

console.log('='.repeat(80))
console.log('TEST COMPLETE')
console.log('='.repeat(80))
