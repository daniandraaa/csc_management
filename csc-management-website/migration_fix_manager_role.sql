-- ==============================================================================
-- CSC Management - FIX: Update season_memberships role constraint to include 'Manager'
-- ==============================================================================
-- This migration fixes the constraint on season_memberships.role to accept 'Manager'
-- which is already present in the existing members data.

-- Drop the old constraint
ALTER TABLE IF EXISTS public.season_memberships 
DROP CONSTRAINT IF EXISTS season_memberships_role_check;

-- Add new constraint that includes 'Manager'
ALTER TABLE IF EXISTS public.season_memberships 
ADD CONSTRAINT season_memberships_role_check 
CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Administration', 'Staff', 'Business Partner', 'Manager'));
