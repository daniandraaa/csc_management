-- Create sop_chatbot_logs table
CREATE TABLE IF NOT EXISTS public.sop_chatbot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id UUID NOT NULL REFERENCES public.sop_guides(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.sop_chatbot_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow members to insert logs" ON public.sop_chatbot_logs;
CREATE POLICY "Allow members to insert logs" ON public.sop_chatbot_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow members to read own logs" ON public.sop_chatbot_logs;
CREATE POLICY "Allow members to read own logs" ON public.sop_chatbot_logs
    FOR SELECT USING (member_id = auth.uid());

-- Storage Bucket for SOPs (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('sops', 'sops', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "SOPs are publicly accessible" ON storage.objects;
CREATE POLICY "SOPs are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'sops');

DROP POLICY IF EXISTS "Members can upload SOPs" ON storage.objects;
CREATE POLICY "Members can upload SOPs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'sops' AND auth.uid() IN (SELECT id FROM members));

-- Add missing file_url column to sop_guides
ALTER TABLE public.sop_guides ADD COLUMN IF NOT EXISTS file_url TEXT;
