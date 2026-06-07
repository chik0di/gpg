// Status values match the Supabase orders.status column
export const ORDER_STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
} as const

export const ORDER_STATUS_COLORS = {
  pending:     'bg-[#FDF3DC] text-[#C4861A]',
  in_progress: 'bg-[#EFF6FF] text-[#3B82F6]',
  completed:   'bg-[#F0FDF4] text-[#16A34A]',
} as const

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS

// Matches the `orders` Supabase table
export interface Order {
  id: string
  user_id: string
  status: string           // 'pending' | 'in_progress' | 'completed'
  total_amount: number     // GBP (e.g. 127.50) — convert to pence for Stripe
  academic_level: string
  subject_field: string
  deadline: string
  additional_instructions?: string | null
  originality_report: boolean
  stripe_payment_intent_id?: string | null
  created_at: string
}

// Matches the `deliverables` Supabase table
export interface Deliverable {
  id: string
  order_id: string
  type: 'written' | 'presentation' | 'practical'
  subtype?: string | null   // practical: category key; presentation: slide band key
  size_band?: string | null // written: page count as string
  price: number             // GBP base price (before multipliers)
  created_at: string
}

// Matches the `order_files` Supabase table
export interface OrderFile {
  id: string
  order_id: string
  file_url: string
  file_type: 'assignment' | 'completed'
  created_at: string
}
