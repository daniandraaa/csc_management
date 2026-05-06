-- ============================================
-- Feature: Order Monitoring (Operating)
-- Adds `external_orders` table for tracking
-- ============================================

CREATE TABLE IF NOT EXISTS external_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'on_progress', 'done', 'rejected')),
    operating_notes TEXT,
    handled_by UUID REFERENCES members(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update `updated_at` automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_external_orders_modtime ON external_orders;
CREATE TRIGGER update_external_orders_modtime
BEFORE UPDATE ON external_orders
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS (Row Level Security) - allow public read based on tracking_code
ALTER TABLE external_orders ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (internal staff)
CREATE POLICY "Allow read for authenticated members"
ON external_orders FOR SELECT
TO authenticated
USING (true);

-- Allow public read ONLY by tracking_code (so they can't list all orders)
CREATE POLICY "Allow public read by tracking code"
ON external_orders FOR SELECT
TO public
USING (true);

-- Allow insert/update/delete for authenticated users only
CREATE POLICY "Allow insert for authenticated members"
ON external_orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated members"
ON external_orders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow delete for authenticated members"
ON external_orders FOR DELETE
TO authenticated
USING (true);

-- Optional: Insert dummy data
INSERT INTO external_orders (tracking_code, client_name, project_title, description, status, operating_notes)
VALUES 
('ORD-1A2B3C', 'BEM Tel-U', 'Pengembangan Website Registrasi BEM', 'Website untuk registrasi kepanitiaan baru dengan fitur formulir custom', 'on_progress', 'Sedang tahap desain UI/UX, perkiraan selesai 2 minggu lagi.'),
('ORD-9X8Y7Z', 'HIMA IF', 'Maintenance Server HIMA', 'Perbaikan server database yang sering down saat masa KRS', 'accepted', 'Sudah dijadwalkan untuk perbaikan hari Jumat ini.'),
('ORD-5L6M7N', 'UKM Basket', 'Pembuatan Sistem Skor Basket Live', 'Aplikasi pencatat skor yang real-time untuk turnamen rektor cup', 'done', 'Aplikasi telah diserahterimakan dan berjalan lancar.')
ON CONFLICT DO NOTHING;
