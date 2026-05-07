-- ============================================
-- Migration: ULTIMATE Member Deletion Fix (V2)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Ensure DELETE policy exists
DROP POLICY IF EXISTS "Authenticated users can delete members" ON members;
CREATE POLICY "Authenticated users can delete members" ON members FOR DELETE TO authenticated USING (true);

-- 2. Fix remaining Foreign Keys that block deletion
-- These were found in V2 schema or missed in previous fix

-- Content Requests (V2 table)
ALTER TABLE content_requests DROP CONSTRAINT IF EXISTS content_requests_handled_by_fkey;
ALTER TABLE content_requests ADD CONSTRAINT content_requests_handled_by_fkey 
    FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;

-- Attendance Sessions (V2 table)
ALTER TABLE attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_created_by_fkey;
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- 3. Double check other potential blockers
-- Programs PIC
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_pic_id_fkey;
ALTER TABLE programs ADD CONSTRAINT programs_pic_id_fkey 
    FOREIGN KEY (pic_id) REFERENCES members(id) ON DELETE SET NULL;

-- Documents Handled By
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_handled_by_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_handled_by_fkey 
    FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
