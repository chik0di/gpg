-- Add length constraints to reviews table for security
-- Protect against excessively long inputs that could cause storage/performance issues

-- Add check constraint for review_text length (2000 chars max)
ALTER TABLE reviews ADD CONSTRAINT review_text_length_check
  CHECK (review_text IS NULL OR length(review_text) <= 2000);

-- Add check constraint for display_name length (100 chars max)
ALTER TABLE reviews ADD CONSTRAINT display_name_length_check
  CHECK (display_name IS NULL OR length(display_name) <= 100);

-- Add check constraint for module_name length (200 chars max)
ALTER TABLE reviews ADD CONSTRAINT module_name_length_check
  CHECK (module_name IS NULL OR length(module_name) <= 200);
