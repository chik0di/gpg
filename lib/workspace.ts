import { z } from 'zod'
import { citationSourceSchema } from './citation-source-validation'
import type { CitationSource, CitationStyle } from './citation-formatter'

export const projectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  module: z.string().trim().max(200).default(''),
  deadline: z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0, 4)) > 0 && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, 'Use a valid deadline.').transform(v => v || null).nullable(),
  requirements: z.string().trim().max(10000).default(''),
})
export const sourceNotesSchema = z.object({
  project_id: z.string().uuid().nullable(),
  reading_status: z.enum(['to_read', 'reading', 'read']),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).transform(tags => [...new Set(tags)]),
  notes: z.string().max(10000),
  quotation: z.string().max(10000),
  page_numbers: z.string().trim().max(200),
})
export const bibliographyDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  project_id: z.string().uuid().nullable(),
  style: z.enum(['APA', 'Harvard', 'Vancouver', 'MLA', 'Chicago']),
  sources: z.array(citationSourceSchema).max(200),
}).refine(v => JSON.stringify(v.sources).length <= 500000, 'This bibliography is too large.')
export const bibliographySchema = bibliographyDraftSchema.refine(v => v.sources.length > 0, 'Add at least one reference.')
export interface StudyProject { id: string; title: string; module: string; deadline: string | null; requirements: string; created_at: string; updated_at: string }
export interface SavedBibliography { id: string; title: string; project_id: string | null; style: CitationStyle; sources: CitationSource[]; updated_at: string }
export interface SourceNotes { project_id: string | null; reading_status: 'to_read' | 'reading' | 'read'; tags: string[]; notes: string; quotation: string; page_numbers: string }
export const emptySourceNotes: SourceNotes = { project_id: null, reading_status: 'to_read', tags: [], notes: '', quotation: '', page_numbers: '' }
