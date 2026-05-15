-- ============================================
-- Migration: Admin Revision System + Program Type
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Revision Logs Table
CREATE TABLE IF NOT EXISTS admin_revision_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES admin_reviews(id) ON DELETE CASCADE NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  revised_by UUID REFERENCES members(id) ON DELETE SET NULL,
  revision_notes TEXT,
  status_before TEXT,
  status_after TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Notification Logs Table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES admin_reviews(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  notification_type TEXT NOT NULL DEFAULT 'deadline_reminder',
  subject TEXT NOT NULL,
  body TEXT,
  days_before_deadline INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

-- 2. Add columns to admin_reviews
ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;
ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS doc_source TEXT DEFAULT 'standalone';
ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'Proposal';

-- 3. Add program_type to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS program_type TEXT DEFAULT 'internal';

-- 4. RLS for admin_revision_logs
ALTER TABLE admin_revision_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read admin_revision_logs" ON admin_revision_logs;
DROP POLICY IF EXISTS "Auth modify admin_revision_logs" ON admin_revision_logs;
DROP POLICY IF EXISTS "Anon read admin_revision_logs" ON admin_revision_logs;
DROP POLICY IF EXISTS "Anon write admin_revision_logs" ON admin_revision_logs;

CREATE POLICY "Auth read admin_revision_logs" ON admin_revision_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth modify admin_revision_logs" ON admin_revision_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Anon read admin_revision_logs" ON admin_revision_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write admin_revision_logs" ON admin_revision_logs FOR ALL TO anon USING (true);

-- 5. RLS for admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Auth modify admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Anon read admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Anon write admin_notifications" ON admin_notifications;

CREATE POLICY "Auth read admin_notifications" ON admin_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth modify admin_notifications" ON admin_notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Anon read admin_notifications" ON admin_notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write admin_notifications" ON admin_notifications FOR ALL TO anon USING (true);

-- 6. Add reminder config columns to admin_settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS remind_days_before TEXT DEFAULT '7,3,1';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS reminder_email_to TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
