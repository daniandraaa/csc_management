-- ==============================================================================
-- CSC Management - ENFORCE ROW LEVEL SECURITY for Season Isolation
-- ==============================================================================
-- Force all operational table queries to include season_id filter
-- This prevents accidental cross-season data leakage at database level

DO $$
DECLARE
    operational_table TEXT;
BEGIN
    -- List of tables that must be season-isolated
    FOREACH operational_table IN ARRAY ARRAY[
        'logbook_entries', 'advocacy_aspirations', 'counseling_requests',
        'events', 'programs', 'program_kpis', 'program_evaluations',
        'reimbursements', 'financial_transactions', 'member_kas',
        'content_plans', 'content_requests', 'pr_requests',
        'external_orders', 'timeline_entries', 'sop_chatbot_logs',
        'ai_faqs', 'performance_rankings', 'attendance_sessions',
        'attendance_session_members'
    ]
    LOOP
        -- Enable RLS on each table
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', operational_table);
        
        -- Drop old policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read season data" ON public.%I', operational_table);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated write season data" ON public.%I', operational_table);
        
        -- Create new policy: READ only active/archived data (no cross-season)
        EXECUTE format(
            'CREATE POLICY "Isolate %I to current season" ON public.%I 
            FOR SELECT 
            USING (
                season_id IN (
                    SELECT id FROM public.seasons 
                    WHERE is_archived = false  -- Can read active seasons
                )
                OR
                EXISTS (  -- Can read from any season if user has direct membership
                    SELECT 1 FROM public.season_memberships sm
                    WHERE sm.season_id = $1.season_id
                    AND sm.member_id = auth.uid()::uuid
                )
            )',
            operational_table,
            operational_table
        );
        
        -- CREATE policy: WRITE only to non-archived seasons
        EXECUTE format(
            'CREATE POLICY "Prevent write archived %I" ON public.%I 
            FOR INSERT, UPDATE, DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.seasons 
                    WHERE id = $1.season_id 
                    AND is_archived = false
                )
            )',
            operational_table,
            operational_table
        );
        
        -- Index on season_id for fast filtering
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_%I_season_id ON public.%I (season_id)',
            operational_table,
            operational_table
        );
        
        RAISE NOTICE 'Applied RLS policies to %', operational_table;
    END LOOP;

    RAISE NOTICE 'Season isolation RLS complete!';
END $$;

-- ==============================================================================
-- ADDITIONAL SAFEGUARDS
-- ==============================================================================

-- Prevent users from directly querying other season's data
-- by enforcing season_id in WHERE clause through SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION get_user_accessible_seasons()
RETURNS TABLE(id UUID, name TEXT, cabinet_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.cabinet_name
    FROM public.seasons s
    LEFT JOIN public.season_memberships sm ON s.id = sm.season_id AND sm.member_id = auth.uid()::uuid
    WHERE s.is_archived = false  -- Can only see active seasons
    OR sm.id IS NOT NULL;         -- Or seasons they're a member of
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all season-scoped data with proper filtering
CREATE OR REPLACE FUNCTION get_season_data(
    p_season_id UUID,
    p_table TEXT
)
RETURNS TABLE AS $$
DECLARE
    query_text TEXT;
BEGIN
    -- Verify user has access to this season
    IF NOT EXISTS (
        SELECT 1 FROM public.season_memberships 
        WHERE season_id = p_season_id 
        AND member_id = auth.uid()::uuid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.seasons 
        WHERE id = p_season_id 
        AND is_archived = false
    ) THEN
        RAISE EXCEPTION 'Access denied to season %', p_season_id;
    END IF;
    
    -- Build dynamic query (if ever needed)
    query_text := format('SELECT * FROM public.%I WHERE season_id = %L', p_table, p_season_id);
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_user_accessible_seasons() TO authenticated;
GRANT EXECUTE ON FUNCTION get_season_data(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION get_user_accessible_seasons() IS 'Return list of seasons user can access (active + member of)';
COMMENT ON FUNCTION get_season_data(UUID, TEXT) IS 'Safely fetch data from a specific season with authorization check';
