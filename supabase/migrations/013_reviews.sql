-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  display_name text,
  is_anonymous boolean default false,
  show_module boolean default true,
  module_name text,
  created_at timestamptz default now(),
  is_approved boolean default false,
  UNIQUE(user_id, order_id)
);

-- RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY 'Users can insert their own reviews'
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY 'Users can read their own reviews'
  ON reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY 'Anyone can read approved reviews'
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- Index for performance
CREATE INDEX idx_reviews_approved ON reviews(is_approved, created_at DESC);
CREATE INDEX idx_reviews_order ON reviews(order_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
