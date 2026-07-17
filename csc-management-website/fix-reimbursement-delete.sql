-- Enable DELETE for anon users on reimbursements table
DROP POLICY IF EXISTS "Anon can delete reimbursements" ON reimbursements;
CREATE POLICY "Anon can delete reimbursements" ON reimbursements FOR DELETE TO anon USING (true);

-- Also ensure financial_transactions can be deleted by anon (just in case)
DROP POLICY IF EXISTS "Anon can delete transactions" ON financial_transactions;
CREATE POLICY "Anon can delete transactions" ON financial_transactions FOR DELETE TO anon USING (true);
