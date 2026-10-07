import { z } from 'zod'
import { citationDate } from './citation-formatter'

const text = z.string().max(2000)
const title = text.trim().min(1)
const authors = z.array(z.string().trim().min(1).max(300)).min(1).max(100)
const year = z.string().trim().max(30).refine(v => !v || /^\d{4}[a-z]?$/i.test(v) || /^(?:n\.?d\.?|no date)$/i.test(v), 'Use a year or leave it blank if undated.')
const url = text.refine(v => { try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password } catch { return false } })
const date = text.refine(v => !!citationDate(v), 'Use a valid date, such as 15 September 2024.')
export const citationSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('book'), authors, title, year, publisher: text, place: text, edition: z.string().max(200).optional(), isbn: z.string().max(30).optional() }),
  z.object({ type: z.literal('journal'), authors, title, year, journalName: title, volume: text, issue: text.optional(), pageRange: text, doi: z.string().trim().max(300).regex(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/\S+$/i).optional(), articleNumber: text.optional(), journalAbbreviation: text.optional() }),
  z.object({ type: z.literal('website'), authors: authors.optional(), organisation: text.optional(), title, year, url, dateAccessed: date, publicationDate: date.optional(), siteName: text.optional(), changesOverTime: z.boolean().optional(), place: text.optional() }).refine(v => v.authors?.length || v.organisation?.trim(), 'Provide an author or organisation.').refine(v => !v.publicationDate || !v.year || String(citationDate(v.publicationDate)?.year) === v.year, 'The publication date and year must agree.'),
])
