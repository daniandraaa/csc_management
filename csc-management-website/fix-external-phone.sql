-- ============================================
-- CSC Management Website
-- Fix: Missing external_phone column
-- ============================================

ALTER TABLE attendance_session_members 
ADD COLUMN IF NOT EXISTS external_phone TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
