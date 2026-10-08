import type { SVGProps } from 'react'

export type AcademicIconName = 'book' | 'website' | 'journal' | 'search' | 'reference'

const paths: Record<AcademicIconName, string> = {
  book: 'M12 5v15m0-15C9 3.5 6 3.5 3 5v15c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0V5c-3-1.5-6-1.5-9 0Z',
  website: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 5 4 13 0 18-4-5-4-13 0-18Z',
  journal: 'M7 3h10a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h12M9 7h6M9 11h6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  reference: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 12h6M9 16h6',
}

export default function AcademicIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AcademicIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>
}
