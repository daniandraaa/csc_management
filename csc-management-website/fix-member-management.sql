-- ============================================
-- Migration: ULTIMATE Database Fixes (Delete Member)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add DELETE policy for members table
DROP POLICY IF EXISTS "Authenticated users can delete members" ON members;
CREATE POLICY "Authenticated users can delete members" ON members FOR DELETE TO authenticated USING (true);

-- 2. Fix all Foreign Key constraints to allow member deletion (SET NULL or CASCADE)

-- Human Resources
ALTER TABLE performance_rankings DROP CONSTRAINT IF EXISTS performance_rankings_evaluated_by_fkey, ADD CONSTRAINT performance_rankings_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE advocacy_aspirations DROP CONSTRAINT IF EXISTS advocacy_aspirations_responded_by_fkey, ADD CONSTRAINT advocacy_aspirations_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE counseling_requests DROP CONSTRAINT IF EXISTS counseling_requests_counselor_id_fkey, ADD CONSTRAINT counseling_requests_counselor_id_fkey FOREIGN KEY (counselor_id) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey, ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- Operating
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_pic_id_fkey, ADD CONSTRAINT programs_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_created_by_fkey, ADD CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE program_evaluations DROP CONSTRAINT IF EXISTS program_evaluations_evaluated_by_fkey, ADD CONSTRAINT program_evaluations_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE sop_guides DROP CONSTRAINT IF EXISTS sop_guides_created_by_fkey, ADD CONSTRAINT sop_guides_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE sop_guides DROP CONSTRAINT IF EXISTS sop_guides_updated_by_fkey, ADD CONSTRAINT sop_guides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES members(id) ON DELETE SET NULL;

-- Finance
ALTER TABLE reimbursements DROP CONSTRAINT IF EXISTS reimbursements_approved_by_fkey, ADD CONSTRAINT reimbursements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_recorded_by_fkey, ADD CONSTRAINT financial_transactions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES members(id) ON DELETE SET NULL;

-- Business
ALTER TABLE business_partners DROP CONSTRAINT IF EXISTS business_partners_created_by_fkey, ADD CONSTRAINT business_partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- Marketing & PR
ALTER TABLE content_plans DROP CONSTRAINT IF EXISTS content_plans_assigned_to_fkey, ADD CONSTRAINT content_plans_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE content_plans DROP CONSTRAINT IF EXISTS content_plans_created_by_fkey, ADD CONSTRAINT content_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE media_partners DROP CONSTRAINT IF EXISTS media_partners_created_by_fkey, ADD CONSTRAINT media_partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE incoming_mails DROP CONSTRAINT IF EXISTS incoming_mails_handled_by_fkey, ADD CONSTRAINT incoming_mails_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE guest_invitations DROP CONSTRAINT IF EXISTS guest_invitations_created_by_fkey, ADD CONSTRAINT guest_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- New V2 Features
ALTER TABLE content_requests DROP CONSTRAINT IF EXISTS content_requests_requester_id_fkey, ADD CONSTRAINT content_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE content_requests DROP CONSTRAINT IF EXISTS content_requests_handled_by_fkey, ADD CONSTRAINT content_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_created_by_fkey, ADD CONSTRAINT attendance_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- Cross-department
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_handled_by_fkey, ADD CONSTRAINT documents_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_created_by_fkey, ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_secretary_reviewed_by_fkey, ADD CONSTRAINT admin_reviews_secretary_reviewed_by_fkey FOREIGN KEY (secretary_reviewed_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_admin_reviewed_by_fkey, ADD CONSTRAINT admin_reviews_admin_reviewed_by_fkey FOREIGN KEY (admin_reviewed_by) REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE timeline_entries DROP CONSTRAINT IF EXISTS timeline_entries_created_by_fkey, ADD CONSTRAINT timeline_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

-- 3. Fix password reset permissions
DROP POLICY IF EXISTS "Authenticated users can update members" ON members;
CREATE POLICY "Authenticated users can update members" ON members FOR UPDATE TO authenticated USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
