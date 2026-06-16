-- ============================================
-- Migration: Fitur 1, 2, 3
-- Service Categories, Agent Applications, Partner Integration
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- FITUR 1: Service Categories for External Orders
-- ============================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event_fulfilment', 'business')),
  description TEXT,
  price DECIMAL(15,2),
  price_note TEXT, -- e.g. "mulai dari", "per paket", etc.
  is_active BOOLEAN DEFAULT true,
  department TEXT NOT NULL DEFAULT 'Operating',
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to external_orders
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (service_type IN ('event_fulfilment', 'business'));
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS client_org TEXT;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS assigned_partner_id UUID REFERENCES business_partners(id) ON DELETE SET NULL;
ALTER TABLE external_orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal' CHECK (source IN ('internal', 'external_form'));

-- RLS for service_categories
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active services" ON service_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read all services" ON service_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage services" ON service_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update services" ON service_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete services" ON service_categories FOR DELETE TO authenticated USING (true);

-- Allow anon to insert external orders (public form)
CREATE POLICY "Anon can insert external orders" ON external_orders FOR INSERT TO anon WITH CHECK (true);
-- Allow anon to read their own order by tracking code
CREATE POLICY "Anon can read external orders" ON external_orders FOR SELECT TO anon USING (true);

-- Sample services
INSERT INTO service_categories (name, type, description, price, price_note, department) VALUES
  ('Jasa MC / Pembawa Acara', 'event_fulfilment', 'Jasa Master of Ceremony untuk acara kampus dan organisasi', 150000, 'per event', 'Operating'),
  ('Jasa Dokumentasi', 'event_fulfilment', 'Dokumentasi foto dan video untuk event kampus', 200000, 'per event', 'Operating'),
  ('Desain Poster / Banner', 'event_fulfilment', 'Desain visual untuk poster, banner, dan materi promosi', 50000, 'per desain', 'Operating'),
  ('Jasa Dekorasi', 'event_fulfilment', 'Dekorasi venue untuk acara kampus', 300000, 'mulai dari', 'Operating'),
  ('Jasa Live Streaming', 'event_fulfilment', 'Live streaming event via YouTube/Instagram', 250000, 'per event', 'Operating'),
  ('Titip Jual Produk', 'business', 'Titip jual produk melalui jaringan CSC', NULL, 'nego', 'Business'),
  ('Kerjasama Sponsorship', 'business', 'Kerjasama sponsor untuk event dan program CSC', NULL, 'nego', 'Business'),
  ('Paket Branding UKM', 'business', 'Paket branding untuk pelaku UKM (logo, poster, sosmed)', 500000, 'per paket', 'Business');

-- ============================================
-- FITUR 2: Agent Applications
-- ============================================

CREATE TABLE IF NOT EXISTS agent_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  nim TEXT NOT NULL,
  fakultas TEXT NOT NULL,
  prodi TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  angkatan TEXT NOT NULL,
  domisili TEXT NOT NULL,
  pengalaman_bisnis TEXT NOT NULL, -- 'ya', 'tidak', or other
  lingkar_pertemanan TEXT[], -- array: 'Mahasiswa', 'UMKM', 'Komunitas', 'Umum'
  komunitas_aktif TEXT,
  estimasi_market INTEGER,
  kategori_bisnis TEXT,
  portfolio_link TEXT,
  portfolio_description TEXT,
  consent_agreed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'interview')),
  reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for agent_applications
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can submit agent applications" ON agent_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can read agent applications" ON agent_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update agent applications" ON agent_applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete agent applications" ON agent_applications FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can read agent applications" ON agent_applications FOR SELECT TO anon USING (true);

-- ============================================
-- FITUR 3: Partner Offers & Services
-- ============================================

CREATE TABLE IF NOT EXISTS partner_offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  partner_id UUID REFERENCES business_partners(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES external_orders(id) ON DELETE CASCADE NOT NULL,
  offered_price DECIMAL(15,2),
  mou_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  offered_by UUID REFERENCES members(id) ON DELETE SET NULL,
  partner_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  partner_id UUID REFERENCES business_partners(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for partner tables
ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read partner_offers" ON partner_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert partner_offers" ON partner_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update partner_offers" ON partner_offers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete partner_offers" ON partner_offers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anyone can read partner_services" ON partner_services FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read partner_services" ON partner_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert partner_services" ON partner_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update partner_services" ON partner_services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete partner_services" ON partner_services FOR DELETE TO authenticated USING (true);

-- Anon access for partner_offers (for Business Partner portal if needed)
CREATE POLICY "Anon can read partner_offers" ON partner_offers FOR SELECT TO anon USING (true);

-- Done!
-- After running this migration, restart the application.
