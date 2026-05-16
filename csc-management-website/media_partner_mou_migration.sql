-- Add mou_link column to media_partners table
ALTER TABLE media_partners ADD COLUMN IF NOT EXISTS mou_link TEXT;
