-- Migration: Add decision_link column to timeline_entries
-- Run this in Supabase SQL Editor

ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS decision_link TEXT;

-- Add comment for clarity
COMMENT ON COLUMN timeline_entries.decision_link IS 'Link to meeting decision document (Google Docs, Notion, etc.)';
