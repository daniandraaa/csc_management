-- Perbaikan RLS Policy untuk Fitur Edit Data, Update Status, dan Reset Password Mitra

-- 1. Izinkan akses anonim (klien web Next.js tanpa session Supabase Auth) untuk mengupdate status pendaftaran agen
DROP POLICY IF EXISTS "Anon can update agent applications" ON agent_applications;
CREATE POLICY "Anon can update agent applications" ON agent_applications FOR UPDATE TO anon USING (true);

-- 2. Izinkan akses anonim untuk mengupdate data member (khususnya untuk fitur sinkronisasi profil mitra dan reset password)
DROP POLICY IF EXISTS "Anon can update members" ON members;
CREATE POLICY "Anon can update members" ON members FOR UPDATE TO anon USING (true);

-- 3. Izinkan akses anonim untuk memasukkan data member (ketika pendaftaran mitra diterima dan akun baru dibuat)
DROP POLICY IF EXISTS "Anon can insert members" ON members;
CREATE POLICY "Anon can insert members" ON members FOR INSERT TO anon WITH CHECK (true);
