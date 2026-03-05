-- ============================================
-- CSC Management Website
-- Schema Update V2 — Feature Restructuring
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Content Requests (for Overview → Marketing pipeline)
CREATE TABLE IF NOT EXISTS content_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'story', 'reel', 'article', 'video', 'other')),
  deadline DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  marketing_notes TEXT,
  handled_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance Sessions (HR-generated from timeline/programs/invitations)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('timeline', 'program', 'invitation', 'event')),
  source_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance Session Members (assigned members + responses)
CREATE TABLE IF NOT EXISTS attendance_session_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'excused', 'alpa')),
  responded_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(session_id, member_id)
);

-- 4. Make advocacy_aspirations member_id nullable (for anonymous submissions)
ALTER TABLE advocacy_aspirations ALTER COLUMN member_id DROP NOT NULL;

-- 5. Make counseling_requests member_id nullable (for anonymous submissions)
ALTER TABLE counseling_requests ALTER COLUMN member_id DROP NOT NULL;

-- ============================================
-- RLS Policies for new tables
-- ============================================

-- Content Requests
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all" ON content_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON content_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON content_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON content_requests FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can read all" ON content_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON content_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON content_requests FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON content_requests FOR DELETE TO anon USING (true);

-- Attendance Sessions
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all" ON attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON attendance_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON attendance_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON attendance_sessions FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can read all" ON attendance_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON attendance_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON attendance_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON attendance_sessions FOR DELETE TO anon USING (true);

-- Attendance Session Members
ALTER TABLE attendance_session_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all" ON attendance_session_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON attendance_session_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON attendance_session_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON attendance_session_members FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can read all" ON attendance_session_members FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON attendance_session_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON attendance_session_members FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON attendance_session_members FOR DELETE TO anon USING (true);

-- Done! Run this SQL in Supabase SQL Editor.
