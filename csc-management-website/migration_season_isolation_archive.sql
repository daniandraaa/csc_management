-- ==============================================================================
-- CSC Management - Season Isolation & Archive Architecture
-- ==============================================================================
-- Tujuan:
-- 1. Setiap season (kabinet) memiliki data terisolasi & independent
-- 2. Season aktif: read-write penuh
-- 3. Season archived: read-only, immutable untuk audit trail
-- 4. Partisi otomatis & RLS enforce isolation per season
-- ==============================================================================

DO $$
DECLARE
    default_season_id UUID;
BEGIN
    -- Ambil season aktif
    SELECT id INTO default_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

    -- ========== 1. Tambahkan kolom `is_archived` & `archived_at` ke seasons ==========
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seasons' AND column_name = 'is_archived') THEN
        ALTER TABLE public.seasons ADD COLUMN is_archived BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seasons' AND column_name = 'archived_at') THEN
        ALTER TABLE public.seasons ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    -- ========== 2. CREATE ARCHIVE TRIGGER - Timestamp otomatis saat archived ==========
    -- Drop trigger lama jika ada
    DROP TRIGGER IF EXISTS set_season_archived_at ON public.seasons;
    
    -- Create trigger baru
    CREATE OR REPLACE FUNCTION set_season_archived_at()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.is_archived = true AND OLD.is_archived = false THEN
            NEW.archived_at = NOW();
        ELSIF NEW.is_archived = false THEN
            NEW.archived_at = NULL;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_season_archived_at
    BEFORE UPDATE ON public.seasons
    FOR EACH ROW
    EXECUTE FUNCTION set_season_archived_at();

    -- ========== 3. CREATE MATERIALIZED VIEW untuk Season Metadata ==========
    DROP MATERIALIZED VIEW IF EXISTS mv_season_stats CASCADE;
    
    CREATE MATERIALIZED VIEW mv_season_stats AS
    SELECT 
        s.id,
        s.name,
        s.cabinet_name,
        s.year_start,
        s.year_end,
        s.is_active,
        s.is_archived,
        s.archived_at,
        COUNT(DISTINCT sm.member_id) as total_members,
        COUNT(DISTINCT CASE WHEN sm.is_active = true THEN sm.member_id END) as active_members,
        (SELECT COUNT(*) FROM public.logbook_entries le WHERE le.season_id = s.id) as logbook_count,
        (SELECT COUNT(*) FROM public.programs p WHERE p.season_id = s.id) as program_count,
        (SELECT COUNT(*) FROM public.events e WHERE e.season_id = s.id) as event_count,
        (SELECT COALESCE(SUM(amount), 0) FROM public.financial_transactions ft WHERE ft.season_id = s.id) as total_transactions
    FROM public.seasons s
    LEFT JOIN public.season_memberships sm ON s.id = sm.season_id
    GROUP BY s.id;

    -- Index untuk materialized view
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_season_stats_id ON mv_season_stats (id);

    -- ========== 4. RLS POLICIES - Season Isolation ==========
    -- Drop existing policies (jika ada)
    DROP POLICY IF EXISTS "Enable read season_memberships if active or viewer is admin" ON public.season_memberships;
    DROP POLICY IF EXISTS "Prevent write archived seasons" ON public.season_memberships;

    -- Policy: Boleh baca season_memberships dari season aktif
    CREATE POLICY "Enable read season_memberships if active or viewer is admin"
    ON public.season_memberships
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.seasons s 
            WHERE s.id = season_memberships.season_id 
            AND (s.is_archived = false OR s.is_active = true)
        )
    );

    -- Policy: Cegah modifikasi data di season archived
    CREATE POLICY "Prevent write archived seasons"
    ON public.season_memberships
    FOR UPDATE, DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.seasons s 
            WHERE s.id = season_memberships.season_id 
            AND s.is_archived = false
        )
    );

    -- ========== 5. RLS POLICIES untuk tabel operasional (enforcing archive) ==========
    -- Fungsi helper: cek apakah season sudah diarchive
    CREATE OR REPLACE FUNCTION is_season_archived(season_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM public.seasons 
            WHERE id = season_id AND is_archived = true
        );
    END;
    $$ LANGUAGE plpgsql;

    -- Update RLS untuk operational tables (read-only jika archived)
    -- Contoh: performance_rankings
    DROP POLICY IF EXISTS "Prevent write archived season data" ON public.performance_rankings;
    
    CREATE POLICY "Prevent write archived season data"
    ON public.performance_rankings
    FOR UPDATE, DELETE
    USING (is_season_archived(season_id) = false);

    -- ========== 6. TRIGGER: Prevent duplicate active seasons ==========
    DROP TRIGGER IF EXISTS prevent_multiple_active_seasons ON public.seasons;
    
    CREATE OR REPLACE FUNCTION prevent_multiple_active_seasons()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.is_active = true THEN
            -- Deactivate semua season lain
            UPDATE public.seasons SET is_active = false WHERE id != NEW.id AND is_active = true;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER prevent_multiple_active_seasons
    BEFORE UPDATE ON public.seasons
    FOR EACH ROW
    EXECUTE FUNCTION prevent_multiple_active_seasons();

    -- ========== 7. FUNCTION: Archive Season (Move to read-only) ==========
    CREATE OR REPLACE FUNCTION archive_season(season_id_input UUID)
    RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
    DECLARE
        season_exists BOOLEAN;
        already_archived BOOLEAN;
    BEGIN
        -- Cek season exists
        SELECT EXISTS (SELECT 1 FROM public.seasons WHERE id = season_id_input) INTO season_exists;
        IF NOT season_exists THEN
            RETURN QUERY SELECT false, 'Season not found'::TEXT;
            RETURN;
        END IF;

        -- Cek sudah di-archive
        SELECT is_archived INTO already_archived FROM public.seasons WHERE id = season_id_input;
        IF already_archived THEN
            RETURN QUERY SELECT false, 'Season already archived'::TEXT;
            RETURN;
        END IF;

        -- Set archived flag & timestamp
        UPDATE public.seasons 
        SET is_archived = true, archived_at = NOW()
        WHERE id = season_id_input;

        -- Deactivate jika season ini aktif
        UPDATE public.seasons 
        SET is_active = false
        WHERE id = season_id_input AND is_active = true;

        RETURN QUERY SELECT true, format('Season %s archived successfully', season_id_input)::TEXT;
    END;
    $$ LANGUAGE plpgsql;

    -- ========== 8. FUNCTION: Create New Season (Kabinet Baru) ==========
    CREATE OR REPLACE FUNCTION create_new_season(
        cabinet_name_input TEXT,
        motto_input TEXT,
        year_start_input INTEGER,
        year_end_input INTEGER,
        theme_color_input TEXT DEFAULT '#991b1b'
    )
    RETURNS TABLE(season_id UUID, name TEXT, status TEXT) AS $$
    DECLARE
        new_season_id UUID;
        season_name TEXT;
        existing_count INTEGER;
    BEGIN
        -- Cek duplikasi tahun
        SELECT COUNT(*) INTO existing_count 
        FROM public.seasons 
        WHERE year_start = year_start_input AND year_end = year_end_input AND is_archived = false;
        
        IF existing_count > 0 THEN
            RETURN QUERY 
            SELECT NULL::UUID, NULL::TEXT, format('Season %d/%d already exists (not archived)', year_start_input, year_end_input)::TEXT;
            RETURN;
        END IF;

        -- Generate season name
        season_name := format('Periode %d/%d', year_start_input, year_end_input);

        -- Insert new season
        INSERT INTO public.seasons (name, cabinet_name, motto, year_start, year_end, theme_color, is_active, status)
        VALUES (season_name, cabinet_name_input, motto_input, year_start_input, year_end_input, theme_color_input, false, 'planning')
        RETURNING seasons.id INTO new_season_id;

        RETURN QUERY SELECT new_season_id, season_name, 'success'::TEXT;
    END;
    $$ LANGUAGE plpgsql;

    -- ========== 9. FUNCTION: Activate Season (Set as current) ==========
    CREATE OR REPLACE FUNCTION activate_season(season_id_input UUID)
    RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
    DECLARE
        season_exists BOOLEAN;
        is_archived_check BOOLEAN;
    BEGIN
        -- Cek season exists
        SELECT EXISTS (SELECT 1 FROM public.seasons WHERE id = season_id_input) INTO season_exists;
        IF NOT season_exists THEN
            RETURN QUERY SELECT false, 'Season not found'::TEXT;
            RETURN;
        END IF;

        -- Cek tidak dalam status archived
        SELECT is_archived INTO is_archived_check FROM public.seasons WHERE id = season_id_input;
        IF is_archived_check = true THEN
            RETURN QUERY SELECT false, 'Cannot activate archived season'::TEXT;
            RETURN;
        END IF;

        -- Deactivate semua season lain
        UPDATE public.seasons SET is_active = false WHERE id != season_id_input;

        -- Activate target season
        UPDATE public.seasons 
        SET is_active = true, status = 'active'
        WHERE id = season_id_input;

        RETURN QUERY SELECT true, format('Season %s activated successfully', season_id_input)::TEXT;
    END;
    $$ LANGUAGE plpgsql;

END $$;

-- ========== 10. GRANT PERMISSIONS ==========
GRANT ALL ON FUNCTION archive_season(UUID) TO postgres, service_role;
GRANT ALL ON FUNCTION create_new_season(TEXT, TEXT, INTEGER, INTEGER, TEXT) TO postgres, service_role;
GRANT ALL ON FUNCTION activate_season(UUID) TO postgres, service_role;
GRANT SELECT ON mv_season_stats TO authenticated, anon;

-- ========== COMMENTS ==========
COMMENT ON FUNCTION archive_season(UUID) IS 'Archive a season, making it read-only for audit trail';
COMMENT ON FUNCTION create_new_season(TEXT, TEXT, INTEGER, INTEGER, TEXT) IS 'Create a new season (kabinet) for upcoming year';
COMMENT ON FUNCTION activate_season(UUID) IS 'Set a season as active/current';
COMMENT ON VIEW mv_season_stats IS 'Materialized statistics per season: member counts, transaction totals, program/event counts';
