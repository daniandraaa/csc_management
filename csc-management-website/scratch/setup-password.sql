-- Run this in Supabase SQL Editor to enable the password system
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_set_password BOOLEAN DEFAULT false;

-- Ensure users can update their own password records
DROP POLICY IF EXISTS "Authenticated users can update members" ON members;
CREATE POLICY "Authenticated users can update members" ON members FOR UPDATE TO authenticated USING (true);
