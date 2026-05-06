-- Run this in Supabase SQL Editor
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT NULL;
