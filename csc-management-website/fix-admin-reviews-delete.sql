-- Migration: Add DELETE policies for admin_reviews table

-- Allow authenticated users to delete admin_reviews
CREATE POLICY "Authenticated users can delete" ON admin_reviews FOR DELETE TO authenticated USING (true);

-- Allow anonymous users to delete admin_reviews (if anon deletion is supported)
CREATE POLICY "Anon can delete" ON admin_reviews FOR DELETE TO anon USING (true);
