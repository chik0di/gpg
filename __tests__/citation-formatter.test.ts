import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { formatCitation, formatBibliography, resetVancouverCounter, sortCitations, citationPlainText, citationDate } from '../lib/citation-formatter'
import type { BookSource, WebsiteSource, JournalSource, CitationStyle } from '../lib/citation-formatter'

// Synthetic representative fixtures, checked against the guides below:
// APA 7: https://apastyle.apa.org/style-grammar-guidelines/references/examples
// Harvard CTR: https://university.open.ac.uk/library/referencing-and-plagiarism/quick-guide-to-harvard-referencing-cite-them-right
// Vancouver ICMJE: https://www.nlm.nih.gov/bsd/uniform_requirements.html
// MLA 9: https://style.mla.org/works-cited/works-cited-a-quick-guide/
// Chicago 18: https://www.chicagomanualofstyle.org/tools_citationguide/citation-guide-2.html
const book: BookSource = { type: 'book', authors: ['Smith, John Michael', 'Jones, Ada'], title: 'Research', year: '2024', publisher: 'Academic Press', place: 'London', edition: '2nd' }
const web: WebsiteSource = { type: 'website', authors: ['Brown, Thomas James'], organisation: 'Example Institute', title: 'Research', year: '2023', url: 'https://example.com/research', dateAccessed: '15 September 2024', publicationDate: '2023-02-10' }
const journal: JournalSource = { type: 'journal', authors: ['Wilson, Karen Marie', 'Davis, Michael', 'Taylor, Rebecca'], title: 'Research', journalName: 'Journal of Research', year: '2024', volume: '45', issue: '3', pageRange: '123-145', doi: '10.1234/research.2024.123' }
const fixtures: Record<CitationStyle, [string, string][]> = {
  APA: [
    ['(Smith & Jones, 2024)', 'Smith, J. M., & Jones, A. (2024). *Research* (2nd ed.). Academic Press.'],
    ['(Brown, 2023)', 'Brown, T. J. (2023, February 10). *Research*. Example Institute. https://example.com/research'],
    ['(Wilson et al., 2024)', 'Wilson, K. M., Davis, M., & Taylor, R. (2024). Research. *Journal of Research*, *45*(3), 123–145. https://doi.org/10.1234/research.2024.123'],
  ],
  Harvard: [
    ['(Smith and Jones, 2024)', 'Smith, J.M. and Jones, A. (2024) *Research*. 2nd edn. Academic Press.'],
    ['(Brown, 2023)', 'Brown, T.J. (2023) *Research*. Available at: https://example.com/research (Accessed: 15 September 2024).'],
    ['(Wilson, Davis and Taylor, 2024)', "Wilson, K.M., Davis, M. and Taylor, R. (2024) 'Research', *Journal of Research*, 45(3), pp. 123–145. Available at: https://doi.org/10.1234/research.2024.123"],
  ],
  Vancouver: [
    ['[1]', '1. Smith JM, Jones A. Research. 2nd ed. London: Academic Press; 2024.'],
    ['[1]', '1. Brown TJ. Research [Internet]. [place unknown]: Example Institute; 2023 Feb 10 [cited 2024 Sep 15]. Available from: https://example.com/research'],
    ['[1]', '1. Wilson KM, Davis M, Taylor R. Research. Journal of Research. 2024;45(3):123-45. doi: 10.1234/research.2024.123.'],
  ],
  MLA: [
    ['(Smith and Jones)', 'Smith, John Michael, and Ada Jones. *Research*. 2nd ed., Academic Press, 2024.'],
    ['(Brown)', 'Brown, Thomas James. “Research.” *Example Institute*, 10 Feb. 2023, https://example.com/research. Accessed 15 Sept. 2024.'],
    ['(Wilson et al.)', 'Wilson, Karen Marie, et al. “Research.” *Journal of Research*, vol. 45, no. 3, 2024, pp. 123–145, https://doi.org/10.1234/research.2024.123.'],
  ],
  Chicago: [
    ['(Smith and Jones 2024)', 'Smith, John Michael, and Ada Jones. 2024. *Research*. 2nd ed. Academic Press.'],
    ['(Brown 2023)', 'Brown, Thomas James. 2023. “Research.” Example Institute. February 10. https://example.com/research.'],
    ['(Wilson et al. 2024)', 'Wilson, Karen Marie, Michael Davis, and Rebecca Taylor. 2024. “Research.” *Journal of Research* 45 (3): 123–45. https://doi.org/10.1234/research.2024.123.'],
  ],
}
beforeEach(() => resetVancouverCounter())
for (const style of Object.keys(fixtures) as CitationStyle[]) for (const [index, source] of [book, web, journal].entries()) {
  test(`${style}: representative ${source.type} citation and reference`, () => {
    const result = formatCitation(source, style)
    assert.equal(result.inText, fixtures[style][index][0]); assert.equal(result.fullReference, fixtures[style][index][1])
    assert.equal(citationPlainText(result).includes('*'), false)
  })
}
test('APA access date is not used as publication date; retrieval date is opt-in', () => {
  const source = { ...web, publicationDate: undefined }
  assert.match(formatCitation(source, 'APA').fullReference, /\(2023\)/)
  assert.doesNotMatch(formatCitation(source, 'APA').fullReference, /September|Retrieved/)
  assert.match(formatCitation({ ...source, changesOverTime: true }, 'APA').fullReference, /Retrieved September 15, 2024, from/)
})
test('APA preserves middle and hyphenated initials and abbreviates only 21+ authors', () => {
  assert.match(formatCitation({ ...book, authors: ['van der Waals, Jean-Paul Albert'] }, 'APA').fullReference, /^van der Waals, J\.-P\. A\./)
  const authors = Array.from({ length: 21 }, (_, i) => `Author${i + 1}, Ada`)
  const reference = formatCitation({ ...book, authors }, 'APA').fullReference
  assert.match(reference, /Author19, A\., \. \. \. Author21, A\./); assert.doesNotMatch(reference, /Author20|&/)
})
test('Harvard uses three authors in text, et al. from four; MLA/Chicago use et al. from three', () => {
  assert.equal(formatCitation(journal, 'Harvard').inText, '(Wilson, Davis and Taylor, 2024)')
  assert.equal(formatCitation({ ...journal, authors: [...journal.authors, 'Brown, Ada'] }, 'Harvard').inText, '(Wilson et al., 2024)')
  assert.equal(formatCitation(journal, 'MLA').inText, '(Wilson et al.)')
  assert.equal(formatCitation(journal, 'Chicago').inText, '(Wilson et al. 2024)')
})
test('Vancouver uses six authors, correct page elision and a verified abbreviation', () => {
  const reference = formatCitation({ ...journal, authors: Array.from({ length: 7 }, (_, i) => `Author${i}, John Michael`), pageRange: '284-287', journalAbbreviation: 'J Res' }, 'Vancouver').fullReference
  assert.match(reference, /Author5 JM, et al\./); assert.doesNotMatch(reference, /Author6/)
  assert.match(reference, /J Res\. 2024;45\(3\):284-7/)
})
test('Article IDs are distinct from page ranges and DOI URLs are normalized', () => {
  const source = { ...journal, pageRange: '', articleNumber: 'e0123', doi: 'https://doi.org/10.1234/research.2024.123' }
  assert.match(formatCitation(source, 'APA').fullReference, /Article e0123/)
  assert.doesNotMatch(formatCitation(source, 'MLA').fullReference, /pp\./)
  for (const style of ['APA', 'Harvard', 'MLA', 'Chicago', 'Vancouver'] as CitationStyle[]) assert.doesNotMatch(formatCitation(source, style).fullReference, /doi\.org\/https/)
})
test('Undated and corporate-authored webpages', () => {
  const source = { ...web, authors: undefined, publicationDate: undefined, year: '' }
  assert.equal(formatCitation(source, 'APA').inText, '(Example Institute, n.d.)')
  assert.equal(formatCitation(source, 'Harvard').inText, '(Example Institute, no date)')
  assert.match(formatCitation(source, 'Chicago').fullReference, /Accessed September 15, 2024/)
  assert.doesNotMatch(formatCitation(source, 'APA').fullReference, /Example Institute\. https/)
})
test('Bibliography sorting, year suffixes, duplicates and stable Vancouver numbering', () => {
  const a = { ...book, title: 'Alpha' }, b = { ...book, title: 'Beta' }
  const references = formatBibliography([b, a, a], 'APA')
  assert.equal(references.length, 2); assert.equal(references[0].inText, '(Smith & Jones, 2024a)'); assert.equal(references[1].inText, '(Smith & Jones, 2024b)')
  const numbered = formatBibliography([book, web, journal], 'Vancouver')
  assert.deepEqual(numbered.map(c => c.inText), ['[1]', '[2]', '[3]'])
  assert.deepEqual(formatBibliography([web, journal], 'Vancouver').map(c => c.inText), ['[1]', '[2]'])
  assert.equal(formatBibliography([a, { ...a, year: '' }], 'APA')[0].source?.year, '')
  const input = [formatCitation({ ...book, authors: ['Zulu, Ada'] }, 'APA'), formatCitation({ ...book, authors: ['Alpha, Ada'] }, 'APA')]
  assert.equal(sortCitations(input)[0].sortKey, 'alpha'); assert.equal(input[0].sortKey, 'zulu')
})
test('Date validation and literal source content', () => {
  assert.equal(citationDate('2024-02-30'), null); assert.equal(citationDate('15 September 2024')?.month, 9)
  const source = { ...book, title: '<img src=x onerror=alert(1)> * Research & science' }
  const citation = formatCitation(source, 'APA')
  assert.equal(citation.runs?.find(run => run.italic)?.text, source.title)
  assert.match(citationPlainText(citation), /\* Research/)
})
