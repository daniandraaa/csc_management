-- ============================================
-- CSC Management Website
-- Schema Update: Attendance Enhancements
-- ============================================

-- 1. Update attendance_session_members to support roles and external attendees
ALTER TABLE attendance_session_members 
ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'Peserta' CHECK (role_type IN ('Peserta', 'Panitia')),
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_name TEXT,
ADD COLUMN IF NOT EXISTS external_org TEXT;

-- 2. Make member_id nullable for external attendees
ALTER TABLE attendance_session_members ALTER COLUMN member_id DROP NOT NULL;

-- 3. Add column to track if a session allows external check-in
ALTER TABLE attendance_sessions
ADD COLUMN IF NOT EXISTS allow_external BOOLEAN DEFAULT false;

-- 4. Enable RLS for public access to specific check-in queries if needed
-- Note: Usually handled by app logic or specific anon policies
