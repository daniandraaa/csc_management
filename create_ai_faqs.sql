CREATE TABLE IF NOT EXISTS public.ai_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_faqs ENABLE ROW LEVEL SECURITY;

-- Menghapus policy lama
DROP POLICY IF EXISTS "Allow all authenticated to read faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all authenticated to insert faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all authenticated to update faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all authenticated to delete faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all to read faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all to insert faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all to update faqs" ON public.ai_faqs;
DROP POLICY IF EXISTS "Allow all to delete faqs" ON public.ai_faqs;

-- Karena aplikasi menggunakan custom auth, Supabase membacanya sebagai 'anon'.
-- Kita mengizinkan semua akses. Keamanan (RBAC) sudah diatur di level frontend Next.js.
CREATE POLICY "Allow all to read faqs" ON public.ai_faqs FOR SELECT USING (true);
CREATE POLICY "Allow all to insert faqs" ON public.ai_faqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update faqs" ON public.ai_faqs FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete faqs" ON public.ai_faqs FOR DELETE USING (true);
