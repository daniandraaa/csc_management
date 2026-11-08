-- ==============================================================================
-- CSC Telkom University Management Website
-- MIGRATION: Multi-Season & Sustainable Governance Architecture
-- ==============================================================================
-- Deskripsi:
-- Memungkinkan sistem CSC Management sustain dari tahun ke tahun dengan:
-- 1. Master tabel `seasons` (kabinet / kepengurusan tahunan).
-- 2. Master tabel `season_memberships` (relasi multi-season per anggota).
-- 3. Menambahkan kolom `season_id` di seluruh tabel operasional secara aman.
-- 4. Mengaitkan seluruh data existing ke Season Default (Inisiasi / 2025-2026).
-- 5. Menambahkan fitur saklar modul (feature flags) per season.
-- ==============================================================================

-- 1. Enable UUID Extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLE SEASONS (Master Periode / Kabinet)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,                         -- Contoh: "Periode 2025/2026", "Periode 2026/2027"
    cabinet_name TEXT NOT NULL,                 -- Contoh: "Kabinet Dormant Sparks", "Kabinet Sinergi"
    motto TEXT,                                 -- Motto kepengurusan
    year_start INTEGER NOT NULL,                -- 2025
    year_end INTEGER NOT NULL,                  -- 2026
    theme_color TEXT DEFAULT '#991b1b',         -- Warna aksen identitas kabinet
    logo_url TEXT,                              -- Logo resmi kabinet
    is_active BOOLEAN DEFAULT false,            -- Flag kabinet yang sedang menjabat aktif saat ini
    status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'archived')),
    feature_flags JSONB DEFAULT '{
        "counseling": true,
        "advocacy": true,
        "kpi": true,
        "logbook": true,
        "finance": true,
        "mitra_portal": true,
        "content_request": true,
        "pr_request": true,
        "operating_systems": true,
        "sop_ai": true
    }'::jsonb,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks unik untuk menghindari duplikasi tahun
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_years ON public.seasons (year_start, year_end);

-- 3. INSERT DEFAULT SEASONS (Foundation Seasons)
-- Memastikan ada minimal 1 season default aktif untuk membungkus data existing Mas Daniandra
INSERT INTO public.seasons (name, cabinet_name, motto, year_start, year_end, is_active, status, theme_color)
VALUES (
    'Periode 2025/2026',
    'Kabinet Dormant Sparks',
    'The Dormants of Impactful Sparks Ecosystem',
    2025,
    2026,
    true,
    'active',
    '#991b1b'
)
ON CONFLICT (year_start, year_end) DO NOTHING;

-- 4. CREATE TABLE SEASON_MEMBERSHIPS (Relasi Multi-Tahun Pengurus)
-- Seorang anggota bisa menjabat di banyak season dengan jabatan & departemen berbeda
CREATE TABLE IF NOT EXISTS public.season_memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    department TEXT,                            -- Departemen di season tersebut
    role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Administration', 'Staff', 'Business Partner')),
    position TEXT,                              -- Nama jabatan spesifik (e.g. "Head of Operating", "Staff HR")
    is_active BOOLEAN DEFAULT true,             -- Status keaktifan di season tersebut
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (season_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_season_memberships_season ON public.season_memberships (season_id);
CREATE INDEX IF NOT EXISTS idx_season_memberships_member ON public.season_memberships (member_id);

-- 5. TAMBAHKAN KOLOM `season_id` KE SELURUH TABEL OPERASIONAL
-- Menggunakan DO block agar idempotent (aman dijalankan berulang kali tanpa error)
DO $$
DECLARE
    default_season_id UUID;
BEGIN
    -- Ambil ID season default yang aktif
    SELECT id INTO default_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
    
    -- a. departments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'season_id') THEN
            ALTER TABLE public.departments ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;
            UPDATE public.departments SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- b. members (relasi default season untuk fallback cepat)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'current_season_id') THEN
            ALTER TABLE public.members ADD COLUMN current_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;
            UPDATE public.members SET current_season_id = default_season_id WHERE current_season_id IS NULL;
        END IF;
    END IF;

    -- c. performance_rankings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_rankings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_rankings' AND column_name = 'season_id') THEN
            ALTER TABLE public.performance_rankings ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.performance_rankings SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- d. advocacy_aspirations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advocacy_aspirations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advocacy_aspirations' AND column_name = 'season_id') THEN
            ALTER TABLE public.advocacy_aspirations ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.advocacy_aspirations SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- e. counseling_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counseling_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'counseling_requests' AND column_name = 'season_id') THEN
            ALTER TABLE public.counseling_requests ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.counseling_requests SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- f. logbook_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logbook_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logbook_entries' AND column_name = 'season_id') THEN
            ALTER TABLE public.logbook_entries ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.logbook_entries SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- g. events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'season_id') THEN
            ALTER TABLE public.events ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.events SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- h. programs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'season_id') THEN
            ALTER TABLE public.programs ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.programs SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- i. program_kpis
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_kpis') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_kpis' AND column_name = 'season_id') THEN
            ALTER TABLE public.program_kpis ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.program_kpis SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- j. program_evaluations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_evaluations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'program_evaluations' AND column_name = 'season_id') THEN
            ALTER TABLE public.program_evaluations ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.program_evaluations SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- k. reimbursements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reimbursements') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reimbursements' AND column_name = 'season_id') THEN
            ALTER TABLE public.reimbursements ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.reimbursements SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- l. financial_transactions & member_kas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'season_id') THEN
            ALTER TABLE public.financial_transactions ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.financial_transactions SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_kas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_kas' AND column_name = 'season_id') THEN
            ALTER TABLE public.member_kas ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.member_kas SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- m. content_plans & content_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_plans') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_plans' AND column_name = 'season_id') THEN
            ALTER TABLE public.content_plans ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.content_plans SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_requests' AND column_name = 'season_id') THEN
            ALTER TABLE public.content_requests ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.content_requests SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- n. pr_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pr_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pr_requests' AND column_name = 'season_id') THEN
            ALTER TABLE public.pr_requests ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.pr_requests SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- o. external_orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_orders' AND column_name = 'season_id') THEN
            ALTER TABLE public.external_orders ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.external_orders SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- p. timeline_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timeline_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timeline_entries' AND column_name = 'season_id') THEN
            ALTER TABLE public.timeline_entries ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.timeline_entries SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- q. sop_chatbot_logs & ai_faqs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sop_chatbot_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sop_chatbot_logs' AND column_name = 'season_id') THEN
            ALTER TABLE public.sop_chatbot_logs ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.sop_chatbot_logs SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_faqs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_faqs' AND column_name = 'season_id') THEN
            ALTER TABLE public.ai_faqs ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
            UPDATE public.ai_faqs SET season_id = default_season_id WHERE season_id IS NULL;
        END IF;
    END IF;

    -- 6. MIGRASI ANGGOTA EXISTING KE `season_memberships`
    -- Seluruh anggota yang ada saat ini otomatis didaftarkan ke season default
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        INSERT INTO public.season_memberships (season_id, member_id, department, role, position, is_active)
        SELECT 
            default_season_id,
            m.id,
            m.department,
            COALESCE(m.role, 'Staff'),
            m.position,
            COALESCE(m.is_active, true)
        FROM public.members m
        ON CONFLICT (season_id, member_id) DO NOTHING;
    END IF;

END $$;

-- 7. ENABLE ROW LEVEL SECURITY & OPEN POLICIES (Supabase Realtime Sync)
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Allow authenticated/admin write on seasons" ON public.seasons FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on season_memberships" ON public.season_memberships FOR SELECT USING (true);
CREATE POLICY "Allow authenticated/admin write on season_memberships" ON public.season_memberships FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.seasons IS 'Master data periode kepengurusan dan kabinet tahunan CSC Telkom University';
COMMENT ON TABLE public.season_memberships IS 'Pencatatan jabatan anggota spesifik per season/kabinet';
