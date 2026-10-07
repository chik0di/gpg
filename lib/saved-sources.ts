import type { ResearchSource } from './research-materials'

export interface SavedSource {
  id: string
  source_key: string
  source_data: ResearchSource
  created_at: string
}

// Prefer DOI so results from different databases identify the same paper.
export function researchSourceKey(source: Pick<ResearchSource, 'doi' | 'url'>): string {
  let doi = source.doi?.trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
  const url = new URL(source.url)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid source link.')
  if (!doi && ['doi.org', 'dx.doi.org'].includes(url.hostname)) doi = decodeURIComponent(url.pathname.slice(1))
  if (doi) return `doi:${doi.toLowerCase()}`
  url.hash = ''
  return `url:${url.href}`
}

export const PENDING_SOURCE_STORAGE_KEY = 'gpg_pending_saved_source'
