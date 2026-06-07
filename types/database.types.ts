// Auto-generate this file by running: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
// Placeholder shape — replace once Supabase project is connected.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      orders: {
        Row: {
          id: string
          user_id: string
          subject: string
          assignment_type: string
          academic_level: string
          word_count: number
          title: string | null
          instructions: string | null
          referencing_style: string | null
          deadline_tier: 'standard' | 'express' | 'urgent'
          deadline: string
          status: string
          price_pence: number
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['orders']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
