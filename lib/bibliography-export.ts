import { Document, Paragraph, TextRun, AlignmentType } from 'docx'
import { formatBibliography, type CitationSource, type CitationStyle } from './citation-formatter'

export function bibliographyDocument(sources: CitationSource[], style: CitationStyle) {
  const references = formatBibliography(sources, style)
  return new Document({
    creator: 'GetPrimeGrade', title: `${style} bibliography`,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480, after: 0 } } } } },
    sections: [{ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: style === 'MLA' ? 'Works Cited' : 'References', bold: true })] }),
      ...references.map(citation => new Paragraph({
        indent: { left: 720, hanging: 720 },
        children: (citation.runs || []).map(run => new TextRun({ text: run.text, italics: !!run.italic })),
      })),
    ] }],
  })
}
