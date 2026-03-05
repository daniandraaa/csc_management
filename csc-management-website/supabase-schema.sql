-- ============================================
-- CSC Telkom University Management Website
-- Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DEPARTMENTS
-- ============================================
CREATE TABLE departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name, slug, description) VALUES
  ('Executive', 'executive', 'Board of executives and organizational leadership'),
  ('Marketing', 'marketing', 'Manages content planning, media partners, mail, and invitations'),
  ('Business', 'business', 'Manages business partnerships'),
  ('Operating', 'operating', 'Manages programs, KPIs, evaluations, and SOPs'),
  ('Human Resource', 'hr', 'Manages performance, advocacy, counseling, logbook, and attendance'),
  ('Financial', 'financial', 'Manages reimbursements and financial transactions');

-- ============================================
-- 2. MEMBERS
-- ============================================
CREATE TABLE members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  nim TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Staff')),
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. HUMAN RESOURCES TABLES
-- ============================================

-- Performance Rankings
CREATE TABLE performance_rankings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  rank INTEGER,
  notes TEXT,
  evaluated_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advocacy & Aspirations
CREATE TABLE advocacy_aspirations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('advocacy', 'aspiration')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'resolved')),
  response TEXT,
  responded_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counseling Requests
CREATE TABLE counseling_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  preferred_date DATE,
  preferred_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  scheduled_date DATE,
  scheduled_time TIME,
  counselor_id UUID REFERENCES members(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logbook Entries
CREATE TABLE logbook_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  hours_spent DECIMAL(4,1),
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'meeting', 'training', 'social', 'other')),
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Attendees
CREATE TABLE event_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'present', 'absent', 'excused')),
  check_in_time TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(event_id, member_id)
);

-- ============================================
-- 4. OPERATING TABLES
-- ============================================

-- Programs (Proker)
CREATE TABLE programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  budget DECIMAL(15,2) DEFAULT 0,
  department_id UUID REFERENCES departments(id),
  pic_id UUID REFERENCES members(id),
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program KPIs
CREATE TABLE program_kpis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  indicator TEXT NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT,
  weight DECIMAL(5,2) DEFAULT 1,
  status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program Evaluations
CREATE TABLE program_evaluations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  evaluation_date DATE DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  recommendations TEXT,
  overall_score DECIMAL(5,2),
  evaluated_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program Partners (Mitra)
CREATE TABLE program_partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  partner_name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  role_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOP Guides
CREATE TABLE sop_guides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_id UUID REFERENCES departments(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES members(id),
  updated_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. FINANCE TABLES
-- ============================================

-- Reimbursements
CREATE TABLE reimbursements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES programs(id),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES members(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Transactions
CREATE TABLE financial_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES programs(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  recorded_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. BUSINESS TABLES
-- ============================================

-- Business Partners
CREATE TABLE business_partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  description TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  partnership_type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospective')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. MARKETING TABLES
-- ============================================

-- Content Plans
CREATE TABLE content_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'story', 'reel', 'article', 'video', 'other')),
  description TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'cancelled')),
  assigned_to UUID REFERENCES members(id),
  content_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Partners
CREATE TABLE media_partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  social_media TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming Mails
CREATE TABLE incoming_mails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  received_date DATE DEFAULT CURRENT_DATE,
  mail_type TEXT DEFAULT 'general' CHECK (mail_type IN ('general', 'invitation', 'proposal', 'official', 'other')),
  file_url TEXT,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
  handled_by UUID REFERENCES members(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest Invitations
CREATE TABLE guest_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_name TEXT NOT NULL,
  organizer TEXT,
  event_date DATE,
  event_location TEXT,
  description TEXT,
  invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'can_attend', 'cannot_attend')),
  notes TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest Invitation PICs
CREATE TABLE guest_invitation_pics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invitation_id UUID REFERENCES guest_invitations(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  is_confirmed BOOLEAN DEFAULT false,
  UNIQUE(invitation_id, member_id)
);

-- ============================================
-- 8. CROSS-DEPARTMENT TABLES
-- ============================================

-- Documents (Surat keluar-masuk)
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_number TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  category TEXT,
  description TEXT,
  file_url TEXT,
  sender TEXT,
  recipient TEXT,
  document_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'archived')),
  handled_by UUID REFERENCES members(id),
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Reviews (2-tier: secretary + administration)
CREATE TABLE admin_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT,
  link_url TEXT,
  -- Secretary review
  secretary_status TEXT DEFAULT 'pending' CHECK (secretary_status IN ('pending', 'approved', 'revision_needed', 'rejected')),
  secretary_reviewed_by UUID REFERENCES members(id),
  secretary_reviewed_at TIMESTAMPTZ,
  secretary_notes TEXT,
  -- Administration review
  admin_status TEXT DEFAULT 'pending' CHECK (admin_status IN ('pending', 'approved', 'revision_needed', 'rejected')),
  admin_reviewed_by UUID REFERENCES members(id),
  admin_reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  -- Change description
  change_description TEXT,
  revision_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Entries (Rapat & Kegiatan)
CREATE TABLE timeline_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'meeting' CHECK (type IN ('meeting', 'activity', 'event', 'announcement')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  attendees_text TEXT,
  decisions TEXT,
  notes TEXT,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ROW LEVEL SECURITY (basic policies)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocacy_aspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_mails ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_invitation_pics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read all data (internal tool)
CREATE POLICY "Authenticated users can read all" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON performance_rankings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON advocacy_aspirations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON counseling_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON logbook_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON program_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON program_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON program_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON sop_guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON reimbursements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON financial_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON business_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON content_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON media_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON incoming_mails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON guest_invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON guest_invitation_pics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON admin_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON timeline_entries FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert/update/delete (internal tool, role enforcement in app)
CREATE POLICY "Authenticated users can insert" ON members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON performance_rankings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON performance_rankings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON performance_rankings FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON advocacy_aspirations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON advocacy_aspirations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON counseling_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON counseling_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON logbook_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON logbook_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON logbook_entries FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON events FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON event_attendees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON event_attendees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON event_attendees FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON programs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON programs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON programs FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON program_kpis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON program_kpis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON program_kpis FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON program_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON program_evaluations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON program_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON program_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON program_partners FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON sop_guides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON sop_guides FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON sop_guides FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON reimbursements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON reimbursements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON financial_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON financial_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON financial_transactions FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON business_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON business_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON business_partners FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON content_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON content_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON content_plans FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON media_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON media_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON media_partners FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON incoming_mails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON incoming_mails FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON guest_invitations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON guest_invitations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON guest_invitations FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON guest_invitation_pics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON guest_invitation_pics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON guest_invitation_pics FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON admin_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON admin_reviews FOR UPDATE TO authenticated USING (true);

-- Also allow anon read for development/testing
CREATE POLICY "Anon can read departments" ON departments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read members" ON members FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON performance_rankings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON advocacy_aspirations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON counseling_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON logbook_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON event_attendees FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON programs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON program_kpis FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON program_evaluations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON program_partners FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON sop_guides FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON reimbursements FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON financial_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON business_partners FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON content_plans FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON media_partners FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON incoming_mails FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON guest_invitations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON guest_invitation_pics FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON documents FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read all" ON admin_reviews FOR SELECT TO anon USING (true);
-- Anon write for development
CREATE POLICY "Anon can insert" ON members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON members FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON performance_rankings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON performance_rankings FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON performance_rankings FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON advocacy_aspirations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON advocacy_aspirations FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON counseling_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON counseling_requests FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON logbook_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON logbook_entries FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON logbook_entries FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON events FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON events FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON event_attendees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON event_attendees FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON event_attendees FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON programs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON programs FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON programs FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON program_kpis FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON program_kpis FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON program_kpis FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON program_evaluations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON program_evaluations FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON program_partners FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON program_partners FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON program_partners FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON sop_guides FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON sop_guides FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON sop_guides FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON reimbursements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON reimbursements FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON financial_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON financial_transactions FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON financial_transactions FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON business_partners FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON business_partners FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON business_partners FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON content_plans FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON content_plans FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON content_plans FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON media_partners FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON media_partners FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON media_partners FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON incoming_mails FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON incoming_mails FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON guest_invitations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON guest_invitations FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON guest_invitations FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON guest_invitation_pics FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON guest_invitation_pics FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON guest_invitation_pics FOR DELETE TO anon USING (true);
CREATE POLICY "Anon can insert" ON documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON documents FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert" ON admin_reviews FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON admin_reviews FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can read all" ON timeline_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert" ON timeline_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update" ON timeline_entries FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete" ON timeline_entries FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can insert" ON timeline_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON timeline_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON timeline_entries FOR DELETE TO authenticated USING (true);

-- ============================================
-- 10. SAMPLE DATA (for development)
-- ============================================

-- Sample departments already inserted above

-- Done! Run this SQL in the Supabase SQL Editor.
