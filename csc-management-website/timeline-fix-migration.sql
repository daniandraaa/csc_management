-- ============================================
-- CSC Management Website
-- Fix: Timeline Entries Schema
-- ============================================

-- Add missing columns to timeline_entries
ALTER TABLE timeline_entries 
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT false;

-- Add RLS policies just in case they are missing or need refresh
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to select timeline_entries" ON timeline_entries;
DROP POLICY IF EXISTS "Allow all users to insert timeline_entries" ON timeline_entries;
DROP POLICY IF EXISTS "Allow all users to update timeline_entries" ON timeline_entries;
DROP POLICY IF EXISTS "Allow all users to delete timeline_entries" ON timeline_entries;

CREATE POLICY "Allow all users to select timeline_entries" ON timeline_entries FOR SELECT USING (true);
CREATE POLICY "Allow all users to insert timeline_entries" ON timeline_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all users to update timeline_entries" ON timeline_entries FOR UPDATE USING (true);
CREATE POLICY "Allow all users to delete timeline_entries" ON timeline_entries FOR DELETE USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
