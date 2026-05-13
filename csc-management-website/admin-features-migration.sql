-- ============================================
-- Migration: Add Administrasi Features Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Administrasi Evaluations (Penilaian Administrasi per Proker)
CREATE TABLE IF NOT EXISTS admin_evaluations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  comments TEXT,
  evaluated_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id) -- One admin evaluation per program
);

-- 3. Administrasi Settings (Singleton table)
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  late_tolerance_days INTEGER DEFAULT 3,
  max_revisions INTEGER DEFAULT 5,
  target_compliance_score INTEGER DEFAULT 80,
  auto_remind_overdue BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize settings if empty
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Insert sample templates
INSERT INTO document_templates (name, type, size, file_url) VALUES
('Format Proposal Kegiatan', 'Proposal', '2.4 MB', '#'),
('Format LPJ Kegiatan', 'LPJ', '1.8 MB', '#'),
('Surat Peminjaman Ruangan', 'Surat', '500 KB', '#'),
('TOR Pembicara', 'TOR', '1.2 MB', '#')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing if any to avoid errors on rerun
DROP POLICY IF EXISTS "Auth read document_templates" ON document_templates;
DROP POLICY IF EXISTS "Auth modify document_templates" ON document_templates;
DROP POLICY IF EXISTS "Auth read admin_evaluations" ON admin_evaluations;
DROP POLICY IF EXISTS "Auth modify admin_evaluations" ON admin_evaluations;
DROP POLICY IF EXISTS "Auth read admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Auth modify admin_settings" ON admin_settings;

CREATE POLICY "Auth read document_templates" ON document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth modify document_templates" ON document_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read admin_evaluations" ON admin_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth modify admin_evaluations" ON admin_evaluations FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read admin_settings" ON admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth modify admin_settings" ON admin_settings FOR ALL TO authenticated USING (true);

-- Also allow anon read/write for development/testing if needed
CREATE POLICY "Anon read document_templates" ON document_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read admin_evaluations" ON admin_evaluations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read admin_settings" ON admin_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon write document_templates" ON document_templates FOR ALL TO anon USING (true);
CREATE POLICY "Anon write admin_evaluations" ON admin_evaluations FOR ALL TO anon USING (true);
CREATE POLICY "Anon write admin_settings" ON admin_settings FOR ALL TO anon USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
