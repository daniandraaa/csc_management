-- Membuat Storage Bucket untuk SOP
INSERT INTO storage.buckets (id, name, public) VALUES ('sops', 'sops', true) ON CONFLICT (id) DO NOTHING;

-- Menghapus policy lama
DROP POLICY IF EXISTS "Public Access SOPs" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert SOPs" ON storage.objects;
DROP POLICY IF EXISTS "Anon Insert SOPs" ON storage.objects;

-- Memberikan akses baca publik
CREATE POLICY "Public Access SOPs" ON storage.objects FOR SELECT USING ( bucket_id = 'sops' );

-- Karena aplikasi Anda menggunakan custom login (bukan login bawaan Supabase Auth), 
-- maka Supabase membaca statusnya sebagai 'anon'. 
-- Oleh karena itu, kita izinkan anon untuk melakukan insert ke bucket 'sops'.
CREATE POLICY "Anon Insert SOPs" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'sops' );
