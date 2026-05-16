-- Add reimbursed_amount to reimbursements
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS reimbursed_amount DECIMAL(15,2);

-- Update financial_transactions to link with reimbursement and member
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reimbursement_id UUID REFERENCES reimbursements(id) ON DELETE SET NULL;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Create member_kas table
CREATE TABLE IF NOT EXISTS member_kas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- The month this payment is for
  amount_paid DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  payment_date DATE,
  transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, month)
);

-- Add kas_monthly_amount to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS kas_monthly_amount DECIMAL(15,2) DEFAULT 20000;

-- RLS for member_kas
ALTER TABLE member_kas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all kas" ON member_kas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kas" ON member_kas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kas" ON member_kas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete kas" ON member_kas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can read all kas" ON member_kas FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert kas" ON member_kas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update kas" ON member_kas FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete kas" ON member_kas FOR DELETE TO anon USING (true);

-- Add receipt_url and update status for member_kas
ALTER TABLE member_kas ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE member_kas DROP CONSTRAINT IF EXISTS member_kas_status_check;
ALTER TABLE member_kas ADD CONSTRAINT member_kas_status_check CHECK (status IN ('unpaid', 'pending', 'partial', 'paid'));

-- Add kas_monthly_amount to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS kas_monthly_amount DECIMAL(15,2) DEFAULT 20000;

-- Remove unique constraint to allow multiple records per month
ALTER TABLE member_kas DROP CONSTRAINT IF EXISTS member_kas_member_id_month_key;

-- Add rejected status to member_kas
ALTER TABLE member_kas DROP CONSTRAINT IF EXISTS member_kas_status_check;
ALTER TABLE member_kas ADD CONSTRAINT member_kas_status_check CHECK (status IN ('unpaid', 'pending', 'partial', 'paid', 'rejected'));
