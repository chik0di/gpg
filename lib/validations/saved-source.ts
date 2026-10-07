import { z } from 'zod'

const link = z.string().max(2000).refine(value => {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}, 'Use an HTTP or HTTPS link.')

export const savedSourceSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  authors: z.string().trim().min(1).max(2000),
  year: z.number().int().min(1500).max(new Date().getFullYear() + 1).nullable(),
  url: link,
  hasFreeAccess: z.boolean(),
  source: z.string().max(200).optional(),
  abstract: z.string().max(20000).optional(),
  journal: z.string().max(1000).optional(),
  doi: z.string().trim().max(250).regex(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/\S+$/i).optional(),
  pdfUrl: link.optional(),
  freeUrl: link.optional(),
})
