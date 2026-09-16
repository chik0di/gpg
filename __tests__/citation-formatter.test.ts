/**
 * Citation Formatter Tests
 * Test all 15 combinations (3 source types × 5 styles)
 */

import { formatCitation, resetVancouverCounter, sortCitations } from '../lib/citation-formatter'
import type { BookSource, WebsiteSource, JournalSource } from '../lib/citation-formatter'

// Sample sources for testing
const bookSource: BookSource = {
  type: 'book',
  authors: ['Smith, J.', 'Jones, A.'],
  title: 'Machine Learning Fundamentals',
  year: '2024',
  publisher: 'Academic Press',
  place: 'London',
}

const websiteSource: WebsiteSource = {
  type: 'website',
  authors: ['Brown, T.'],
  organisation: 'OpenAI',
  title: 'Introduction to Neural Networks',
  year: '2023',
  url: 'https://example.com/article',
  dateAccessed: '15 September 2024',
}

const journalSource: JournalSource = {
  type: 'journal',
  authors: ['Wilson, K.', 'Davis, M.', 'Taylor, R.'],
  title: 'Advances in Deep Learning',
  journalName: 'Journal of AI Research',
  year: '2024',
  volume: '45',
  issue: '3',
  pageRange: '123-145',
  doi: '10.1234/jair.2024.123',
}

describe('Citation Formatter', () => {
  beforeEach(() => {
    resetVancouverCounter()
  })

  // ===================
  // APA Tests
  // ===================
  describe('APA 7th Edition', () => {
    test('Book', () => {
      const result = formatCitation(bookSource, 'APA')
      expect(result.inText).toBe('(Smith and Jones, 2024)')
      expect(result.fullReference).toContain('Smith, J., & Jones, A.')
      expect(result.fullReference).toContain('(2024)')
      expect(result.fullReference).toContain('*Machine Learning Fundamentals*')
      expect(result.fullReference).toContain('Academic Press')
      console.log('APA Book:', result)
    })

    test('Website', () => {
      const result = formatCitation(websiteSource, 'APA')
      expect(result.inText).toBe('(Brown, 2023)')
      expect(result.fullReference).toContain('Brown, T.')
      expect(result.fullReference).toContain('(2023)')
      expect(result.fullReference).toContain('Retrieved 15 September 2024')
      console.log('APA Website:', result)
    })

    test('Journal', () => {
      const result = formatCitation(journalSource, 'APA')
      expect(result.inText).toBe('(Wilson et al., 2024)')
      expect(result.fullReference).toContain('*45*(3)')
      expect(result.fullReference).toContain('https://doi.org/10.1234/jair.2024.123')
      console.log('APA Journal:', result)
    })
  })

  // ===================
  // Harvard Tests
  // ===================
  describe('Harvard', () => {
    test('Book', () => {
      const result = formatCitation(bookSource, 'Harvard')
      expect(result.inText).toBe('(Smith and Jones, 2024)')
      expect(result.fullReference).toContain('London: Academic Press')
      console.log('Harvard Book:', result)
    })

    test('Website', () => {
      const result = formatCitation(websiteSource, 'Harvard')
      expect(result.inText).toBe('(Brown, 2023)')
      expect(result.fullReference).toContain('Available at:')
      expect(result.fullReference).toContain('(Accessed: 15 September 2024)')
      console.log('Harvard Website:', result)
    })

    test('Journal', () => {
      const result = formatCitation(journalSource, 'Harvard')
      expect(result.inText).toBe('(Wilson et al., 2024)')
      expect(result.fullReference).toContain('pp. 123-145')
      console.log('Harvard Journal:', result)
    })
  })

  // ===================
  // Vancouver Tests
  // ===================
  describe('Vancouver', () => {
    test('Book', () => {
      const result = formatCitation(bookSource, 'Vancouver')
      expect(result.inText).toBe('[1]')
      expect(result.fullReference).toMatch(/^1\./)
      expect(result.fullReference).toContain('2024.')
      console.log('Vancouver Book:', result)
    })

    test('Website', () => {
      resetVancouverCounter()
      const result = formatCitation(websiteSource, 'Vancouver')
      expect(result.inText).toBe('[1]')
      expect(result.fullReference).toContain('[Internet]')
      expect(result.fullReference).toContain('[cited 15 September 2024]')
      console.log('Vancouver Website:', result)
    })

    test('Journal', () => {
      resetVancouverCounter()
      const result = formatCitation(journalSource, 'Vancouver')
      expect(result.inText).toBe('[1]')
      expect(result.fullReference).toContain('2024;45(3):123-145')
      console.log('Vancouver Journal:', result)
    })
  })

  // ===================
  // MLA Tests
  // ===================
  describe('MLA 9th Edition', () => {
    test('Book', () => {
      const result = formatCitation(bookSource, 'MLA')
      expect(result.inText).toBe('(Smith and Jones)')
      expect(result.fullReference).toContain('Academic Press, 2024')
      console.log('MLA Book:', result)
    })

    test('Website', () => {
      const result = formatCitation(websiteSource, 'MLA')
      expect(result.inText).toBe('(Brown)')
      expect(result.fullReference).toContain('Accessed 15 September 2024')
      console.log('MLA Website:', result)
    })

    test('Journal', () => {
      const result = formatCitation(journalSource, 'MLA')
      expect(result.inText).toBe('(Wilson et al.)')
      expect(result.fullReference).toContain('vol. 45, no. 3')
      expect(result.fullReference).toContain('doi:10.1234/jair.2024.123')
      console.log('MLA Journal:', result)
    })
  })

  // ===================
  // Chicago Tests
  // ===================
  describe('Chicago (Author-Date)', () => {
    test('Book', () => {
      const result = formatCitation(bookSource, 'Chicago')
      expect(result.inText).toBe('(Smith and Jones 2024)')
      expect(result.fullReference).toContain('2024. *Machine Learning Fundamentals*')
      console.log('Chicago Book:', result)
    })

    test('Website', () => {
      const result = formatCitation(websiteSource, 'Chicago')
      expect(result.inText).toBe('(Brown 2023)')
      expect(result.fullReference).toContain('Accessed 15 September 2024')
      console.log('Chicago Website:', result)
    })

    test('Journal', () => {
      const result = formatCitation(journalSource, 'Chicago')
      expect(result.inText).toBe('(Wilson et al. 2024)')
      expect(result.fullReference).toContain('45, no. 3: 123-145')
      console.log('Chicago Journal:', result)
    })
  })

  // ===================
  // Sorting Tests
  // ===================
  describe('Bibliography Sorting', () => {
    test('Sorts alphabetically by author', () => {
      const citations = [
        formatCitation({ ...bookSource, authors: ['Zulu, A.'] }, 'APA'),
        formatCitation({ ...bookSource, authors: ['Alpha, B.'] }, 'APA'),
        formatCitation({ ...bookSource, authors: ['Miller, C.'] }, 'APA'),
      ]

      const sorted = sortCitations(citations)
      expect(sorted[0].sortKey).toBe('alpha')
      expect(sorted[1].sortKey).toBe('miller')
      expect(sorted[2].sortKey).toBe('zulu')
    })

    test('Vancouver sorts by number', () => {
      resetVancouverCounter()
      const citations = [
        formatCitation(bookSource, 'Vancouver'),
        formatCitation(websiteSource, 'Vancouver'),
        formatCitation(journalSource, 'Vancouver'),
      ]

      const sorted = sortCitations(citations)
      expect(sorted[0].inText).toBe('[1]')
      expect(sorted[1].inText).toBe('[2]')
      expect(sorted[2].inText).toBe('[3]')
    })
  })
})
