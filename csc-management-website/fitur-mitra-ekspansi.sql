-- ============================================
-- Migration: Ekspansi Mitra Bisnis & Order Monitoring
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Tambahan relasi dan perhitungan untuk Order Monitoring
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS assigned_mitra_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS order_value DECIMAL(15,2);
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS partner_fee DECIMAL(15,2);
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS partner_status_request TEXT;

-- 2. Tambahan relasi Layanan Mitra
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- 3. RLS untuk Mitra Bisnis membuat layanan
-- Izinkan anonim/mitra (yang login lewat localStorage) untuk membuat dan mengupdate layanannya sendiri
DROP POLICY IF EXISTS "Anon can insert services" ON service_categories;
CREATE POLICY "Anon can insert services" ON service_categories FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update services" ON service_categories;
CREATE POLICY "Anon can update services" ON service_categories FOR UPDATE TO anon USING (true);
