-- ============================================
-- CSC Management Website
-- Fix: External Attendance Details
-- ============================================

ALTER TABLE attendance_session_members 
ADD COLUMN IF NOT EXISTS external_nim TEXT,
ADD COLUMN IF NOT EXISTS external_faculty TEXT,
ADD COLUMN IF NOT EXISTS external_major TEXT,
ADD COLUMN IF NOT EXISTS external_type TEXT DEFAULT 'Eksternal'; -- 'Mahasiswa Telkom' or 'Eksternal'

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
