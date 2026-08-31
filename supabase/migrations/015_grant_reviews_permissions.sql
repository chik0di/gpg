-- Ensure the anon role has SELECT permission on the reviews table
GRANT SELECT ON reviews TO anon;
GRANT SELECT ON reviews TO authenticated;
