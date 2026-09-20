-- Migration 020: Add suspicious_content_flag to brief_extractions table
-- Tracks briefs that contain suspicious content patterns detected by AI

ALTER TABLE brief_extractions
ADD COLUMN IF NOT EXISTS suspicious_content_flag BOOLEAN DEFAULT false;

-- Add index for admin filtering
CREATE INDEX IF NOT EXISTS idx_brief_extractions_suspicious
ON brief_extractions(suspicious_content_flag)
WHERE suspicious_content_flag = true;

-- Add comment explaining the column
COMMENT ON COLUMN brief_extractions.suspicious_content_flag IS
'True if AI detected suspicious content patterns in the uploaded brief (exam questions, academic dishonesty attempts, etc).';
