-- ============================================
-- Fix: Enable DELETE Policies for Core Modules
-- Run this in Supabase SQL Editor
-- ============================================

-- Advocacy & Aspirations
DROP POLICY IF EXISTS "Authenticated users can delete advocacy" ON advocacy_aspirations;
CREATE POLICY "Authenticated users can delete advocacy" ON advocacy_aspirations FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Anon can delete advocacy" ON advocacy_aspirations;
CREATE POLICY "Anon can delete advocacy" ON advocacy_aspirations FOR DELETE TO anon USING (true);

-- Counseling Requests
DROP POLICY IF EXISTS "Authenticated users can delete counseling" ON counseling_requests;
CREATE POLICY "Authenticated users can delete counseling" ON counseling_requests FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Anon can delete counseling" ON counseling_requests;
CREATE POLICY "Anon can delete counseling" ON counseling_requests FOR DELETE TO anon USING (true);

-- Reimbursements
DROP POLICY IF EXISTS "Authenticated users can delete reimbursements" ON reimbursements;
CREATE POLICY "Authenticated users can delete reimbursements" ON reimbursements FOR DELETE TO authenticated USING (true);

-- Programs
DROP POLICY IF EXISTS "Authenticated users can delete programs" ON programs;
CREATE POLICY "Authenticated users can delete programs" ON programs FOR DELETE TO authenticated USING (true);

-- Documents
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON documents;
CREATE POLICY "Authenticated users can delete documents" ON documents FOR DELETE TO authenticated USING (true);

-- Financial Transactions
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON financial_transactions;
CREATE POLICY "Authenticated users can delete transactions" ON financial_transactions FOR DELETE TO authenticated USING (true);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
