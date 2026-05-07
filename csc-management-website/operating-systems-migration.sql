-- ============================================
-- CSC Management Website
-- Schema Update: Operating Systems Digitization
-- ============================================

-- 1. Broadcast Scheduling Log
CREATE TABLE IF NOT EXISTS broadcast_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broadcast_date DATE NOT NULL,
    broadcast_time TEXT NOT NULL, -- "9:00-9:30", "13:00-13:30", "16:00-16:30", "21:00-22:00"
    title TEXT NOT NULL,
    channel TEXT NOT NULL, -- Instagram story, Whatsapp group, Discord, Line Square
    audience TEXT NOT NULL, -- Seluruh Mahasiswa, Internal CSC, Partner Luar
    status TEXT NOT NULL DEFAULT 'Scheduled', -- Sent, Scheduled, Cancelled
    bidang TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Editorial Plan & Publication Queue
CREATE TABLE IF NOT EXISTS editorial_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publish_date DATE NOT NULL,
    title TEXT NOT NULL,
    platform TEXT NOT NULL, -- Instagram Feed, Tiktok, Reels, LinkedIn
    content_type TEXT NOT NULL, -- Promo Proker, Edukasi, Partnership, Behind The Scenes
    status TEXT NOT NULL DEFAULT 'Scripting', -- Ready to Post, Filming, Scripting, Editing
    pic_id UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Cross-Department Directory
CREATE TABLE IF NOT EXISTS operating_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement TEXT NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update programs table for enhanced tracking
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sop_sent BOOLEAN DEFAULT false;

-- 5. Add RLS policies (Basic: authenticated users can read/write for now, or refine later)
ALTER TABLE broadcast_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_directory ENABLE ROW LEVEL SECURITY;

-- Broadcast Policies
DROP POLICY IF EXISTS "Allow all authenticated users to select broadcasts" ON broadcast_schedules;
DROP POLICY IF EXISTS "Allow all authenticated users to insert broadcasts" ON broadcast_schedules;
DROP POLICY IF EXISTS "Allow all authenticated users to update broadcasts" ON broadcast_schedules;
DROP POLICY IF EXISTS "Allow all authenticated users to delete broadcasts" ON broadcast_schedules;

CREATE POLICY "Allow all authenticated users to select broadcasts" ON broadcast_schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to insert broadcasts" ON broadcast_schedules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to update broadcasts" ON broadcast_schedules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to delete broadcasts" ON broadcast_schedules FOR DELETE USING (auth.role() = 'authenticated');

-- Editorial Policies
DROP POLICY IF EXISTS "Allow all authenticated users to select editorial" ON editorial_plans;
DROP POLICY IF EXISTS "Allow all authenticated users to insert editorial" ON editorial_plans;
DROP POLICY IF EXISTS "Allow all authenticated users to update editorial" ON editorial_plans;
DROP POLICY IF EXISTS "Allow all authenticated users to delete editorial" ON editorial_plans;

CREATE POLICY "Allow all authenticated users to select editorial" ON editorial_plans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to insert editorial" ON editorial_plans FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to update editorial" ON editorial_plans FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to delete editorial" ON editorial_plans FOR DELETE USING (auth.role() = 'authenticated');

-- Directory Policies
DROP POLICY IF EXISTS "Allow all authenticated users to select directory" ON operating_directory;
DROP POLICY IF EXISTS "Allow all authenticated users to insert directory" ON operating_directory;
DROP POLICY IF EXISTS "Allow all authenticated users to update directory" ON operating_directory;
DROP POLICY IF EXISTS "Allow all authenticated users to delete directory" ON operating_directory;

CREATE POLICY "Allow all authenticated users to select directory" ON operating_directory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to insert directory" ON operating_directory FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to update directory" ON operating_directory FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users to delete directory" ON operating_directory FOR DELETE USING (auth.role() = 'authenticated');
