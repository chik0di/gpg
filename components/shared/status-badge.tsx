import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'
import { REVISION_STATUS_LABELS } from '@/lib/revisions'

const revisionColors: Record<string, string> = {
  requested: 'bg-[#FDF3DC] text-[#815812] border-[#E8D4AB]',
  in_progress: 'bg-[#EBF0F6] text-[#1B2E4B] border-[#CBD5E1]',
  delivered: 'bg-[#EFF8F2] text-[#21633D] border-[#BCDCC7]',
  cancelled: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
  declined: 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]',
}

export default function StatusBadge({ status, kind = 'order' }: { status: string; kind?: 'order' | 'revision' }) {
  const labels = kind === 'order' ? ORDER_STATUS_LABELS : REVISION_STATUS_LABELS
  const colors = kind === 'order' ? ORDER_STATUS_COLORS : revisionColors
  const label = (labels as Record<string, string>)[status] || status
  const color = (colors as Record<string, string>)[status] || 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
  return <span className={`ui-status ${color}`}>{label}</span>
}
