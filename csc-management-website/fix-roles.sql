-- ============================================
-- Fix: Update Member Roles Constraint
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop existing constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;

-- 2. Add updated constraint with 'Manager' role
ALTER TABLE members ADD CONSTRAINT members_role_check 
    CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Staff', 'Administration', 'Business Partner', 'Manager'));

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
