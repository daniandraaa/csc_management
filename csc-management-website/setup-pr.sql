-- Create pr_requests table
CREATE TABLE IF NOT EXISTS pr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES members(id),
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, rejected
    notes TEXT,
    handled_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create pr_jobdesk table
CREATE TABLE IF NOT EXISTS pr_jobdesk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Penyebaran Undangan', 'Penyampaian Informasi', 'Pengerjaan Konten', 'Lainnya'
    description TEXT,
    pic_id UUID REFERENCES members(id),
    deadline DATE,
    status TEXT DEFAULT 'pending', -- pending, on_going, done
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE pr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_jobdesk ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow authenticated)
CREATE POLICY "Allow all for authenticated" ON pr_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON pr_jobdesk FOR ALL USING (auth.role() = 'authenticated');
