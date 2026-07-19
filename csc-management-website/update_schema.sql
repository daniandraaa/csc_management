ALTER TABLE public.external_orders ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE members ALTER COLUMN kas_monthly_amount SET DEFAULT 25000;
UPDATE members SET kas_monthly_amount = 25000 WHERE kas_monthly_amount = 20000;
