import { formatRevisionDate } from '@/lib/revisions'

export interface DeliveryVersion { id: string; url: string | null; created_at: string; revision_id?: string | null }

export default function DeliveryHistory({ files }: { files: DeliveryVersion[] }) {
  if (!files.length) return null
  return <section className="bg-white rounded-2xl border border-[#E8E2D9] p-5 space-y-3">
    <h2 className="text-lg font-bold text-[#1B2E4B]">Delivery history</h2>
    {files.map((f, index) => <div key={f.id} className="flex items-center justify-between gap-3 text-sm border-t border-[#E8E2D9] pt-3">
      <div><p className="font-semibold">{f.revision_id ? 'Revised work' : 'Delivered work'}{index === 0 ? ' — latest' : ''}</p><p className="text-xs text-[#6B7280] mt-1">{formatRevisionDate(f.created_at)}</p></div>
      {f.url ? <a className="font-semibold text-[#1B2E4B] underline" href={f.url} target="_blank" rel="noopener noreferrer">Download</a> : <span>Download unavailable</span>}
    </div>)}
  </section>
}
