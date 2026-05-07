-- ============================================
-- Fix: Solve Member Deletion for PR Module
-- Run this in Supabase SQL Editor
-- ============================================

-- Fix pr_requests
ALTER TABLE pr_requests DROP CONSTRAINT IF EXISTS pr_requests_requester_id_fkey;
ALTER TABLE pr_requests ADD CONSTRAINT pr_requests_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE pr_requests DROP CONSTRAINT IF EXISTS pr_requests_handled_by_fkey;
ALTER TABLE pr_requests ADD CONSTRAINT pr_requests_handled_by_fkey 
    FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;

-- Fix pr_jobdesk
ALTER TABLE pr_jobdesk DROP CONSTRAINT IF EXISTS pr_jobdesk_pic_id_fkey;
ALTER TABLE pr_jobdesk ADD CONSTRAINT pr_jobdesk_pic_id_fkey 
    FOREIGN KEY (pic_id) REFERENCES members(id) ON DELETE SET NULL;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
