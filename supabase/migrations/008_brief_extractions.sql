-- Create brief_extractions table for storing AI extraction results
CREATE TABLE IF NOT EXISTS brief_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  raw_extraction JSONB NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (no restrictive policies for now, admin service role can read everything)
ALTER TABLE brief_extractions ENABLE ROW LEVEL SECURITY;

-- Add AI extraction columns to deliverables table
ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS extracted_by_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_description TEXT,
  ADD COLUMN IF NOT EXISTS raw_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS quantity_type TEXT;

-- Create index for faster session_id lookups
CREATE INDEX IF NOT EXISTS idx_brief_extractions_session_id ON brief_extractions(session_id);
CREATE INDEX IF NOT EXISTS idx_brief_extractions_created_at ON brief_extractions(created_at DESC);
