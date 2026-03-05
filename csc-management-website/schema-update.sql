-- ============================================
-- CSC Management — Schema Updates
-- Run AFTER the main supabase-schema.sql
-- ============================================

-- Update role CHECK constraint to include Administration and Business Partner
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check 
    CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Staff', 'Administration', 'Business Partner'));

-- Add document_id to admin_reviews for linking
ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Add program_id to timeline_entries for auto-linking
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

-- Add event_id to timeline_entries for attendance linking
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- ============================================
-- Password Authentication columns
-- ============================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_set_password BOOLEAN DEFAULT FALSE;
