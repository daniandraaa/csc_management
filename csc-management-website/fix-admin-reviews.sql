-- ============================================
-- Migration: Add document_id to admin_reviews
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE admin_reviews ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
