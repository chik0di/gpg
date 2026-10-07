'use client'

import { useState } from 'react'
import type { BookMatch, BookEdition } from '@/lib/open-library'
import type { ReferenceMetadata } from '@/lib/academic-metadata'

interface Props { onSelect: (metadata: ReferenceMetadata, provider: string) => void; onBusyChange: (busy: boolean) => void }
export default function BookTitleSearch({ onSelect, onBusyChange }: Props) {
  const [title, setTitle] = useState(''), [author, setAuthor] = useState('')
  const [books, setBooks] = useState<BookMatch[]>([]), [editions, setEditions] = useState<BookEdition[]>([])
  const [selectedBook, setSelectedBook] = useState<BookMatch | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [searched, setSearched] = useState(false)
  const [bookPage, setBookPage] = useState(1), [editionPage, setEditionPage] = useState(1)
  const [moreBooks, setMoreBooks] = useState(false), [moreEditions, setMoreEditions] = useState(false)
  const [submitted, setSubmitted] = useState({ title: '', author: '' })

  async function get(params: Record<string, string>) {
    const response = await fetch(`/api/resources/books?${new URLSearchParams(params)}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Book lookup failed. Please try again.')
    return data
  }
  async function search(page = 1) {
    setLoading(true); onBusyChange(true); setError('')
    const query = page === 1 ? { title: title.trim(), author: author.trim() } : submitted
    if (page === 1) { setMoreBooks(false); setBookPage(1); setSelectedBook(null); setBooks([]); setSearched(true); setSubmitted(query) }
    try {
      const data = await get({ ...query, page: String(page) })
      setBooks(prev => page === 1 ? data.books : [...prev, ...data.books]); setBookPage(page); setMoreBooks(data.hasMore)
    } catch (err) { setError(err instanceof Error ? err.message : 'Book search failed.') }
    finally { setLoading(false); onBusyChange(false) }
  }
  async function showEditions(book: BookMatch, page = 1) {
    setLoading(true); onBusyChange(true); setError(''); setSelectedBook(book)
    if (page === 1) { setEditions([]); setMoreEditions(false); setEditionPage(1) }
    try {
      const data = await get({ work: book.key, page: String(page) })
      setEditions(prev => page === 1 ? data.editions : [...prev, ...data.editions]); setEditionPage(page); setMoreEditions(data.hasMore)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load editions.') }
    finally { setLoading(false); onBusyChange(false) }
  }
  async function chooseEdition(edition: BookEdition) {
    setLoading(true); onBusyChange(true); setError('')
    try { const data = await get({ edition: edition.key }); onSelect(data.metadata, data.provider) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load this edition.') }
    finally { setLoading(false); onBusyChange(false) }
  }
  const inputClass = 'w-full min-w-0 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30'
  return <div className="space-y-4">
    <form onSubmit={event => { event.preventDefault(); void search() }} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-[#1B2E4B]">Book title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required disabled={loading} placeholder="e.g., Research methods" className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-[#1B2E4B]">Author (optional)<input value={author} onChange={e => setAuthor(e.target.value)} maxLength={200} disabled={loading} placeholder="e.g., John Smith" className={`${inputClass} mt-1`} /></label>
      </div>
      <button disabled={loading || !title.trim()} className="px-5 py-3 bg-[#1B2E4B] text-white font-bold rounded-xl disabled:opacity-50">Search books</button>
    </form>
    <p className="text-xs text-[#6B7280]">Search powered by Open Library. Choose the edition you used; its year and publisher can differ from the book’s first publication.</p>
    {loading && <p role="status" className="text-sm text-[#6B7280]">Retrieving book details…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {selectedBook ? <div className="space-y-3">
      <button disabled={loading} onClick={() => { setSelectedBook(null); setError('') }} className="text-sm font-semibold text-[#1B2E4B] underline">Back to matching books</button>
      <h3 className="font-bold text-[#1B2E4B]">Choose an edition of {selectedBook.title}</h3>
      {!loading && !error && editions.length === 0 && <p className="text-sm text-[#6B7280]">No editions were listed. Try another matching book or enter the details manually.</p>}
      {editions.map(edition => <div key={edition.key} className="border border-[#E8E2D9] rounded-xl p-4 space-y-2">
        <p className="font-semibold text-sm text-[#1B2E4B]">{edition.title || selectedBook.title}</p>
        <p className="text-sm text-[#6B7280]">{edition.date || 'Publication date not listed'} · {edition.publishers.join('; ') || 'Publisher not listed'}{edition.edition ? ` · ${edition.edition}` : ''}</p>
        {edition.languages.length > 0 && <p className="text-xs text-[#6B7280]">Language: {edition.languages.join(', ')}</p>}
        {edition.isbn && <p className="text-xs text-[#6B7280]">ISBN: {edition.isbn}</p>}
        <button disabled={loading} onClick={() => void chooseEdition(edition)} className="px-4 py-2 bg-[#F5F0E8] font-semibold text-sm text-[#1B2E4B] rounded-xl disabled:opacity-50">Use this edition</button>
      </div>)}
      {moreEditions && <button disabled={loading} onClick={() => void showEditions(selectedBook, editionPage + 1)} className="text-sm font-semibold text-[#1B2E4B] underline">Load more editions</button>}
      {error && editions.length === 0 && <button disabled={loading} onClick={() => void showEditions(selectedBook)} className="text-sm font-semibold underline">Retry editions</button>}
    </div> : <div className="space-y-3">
      {searched && !loading && !error && books.length === 0 && <p className="text-sm text-[#6B7280]">No books matched “{submitted.title}”. Try fewer words or leave the author blank.</p>}
      {books.map(book => <div key={book.key} className="border border-[#E8E2D9] rounded-xl p-4 space-y-2">
        <p className="font-semibold text-sm text-[#1B2E4B]">{book.title}</p>
        <p className="text-sm text-[#6B7280]">{book.authors.join('; ') || 'Author not listed'}{book.firstYear ? ` · First published ${book.firstYear}` : ''}</p>
        <button disabled={loading} onClick={() => void showEditions(book)} className="px-4 py-2 bg-[#F5F0E8] font-semibold text-sm text-[#1B2E4B] rounded-xl disabled:opacity-50">Choose edition</button>
      </div>)}
      {moreBooks && <button disabled={loading} onClick={() => void search(bookPage + 1)} className="text-sm font-semibold text-[#1B2E4B] underline">Load more books</button>}
    </div>}
  </div>
}
