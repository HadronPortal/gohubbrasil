-- Fix search path for security
ALTER FUNCTION public.delete_barbershop_safe(UUID) SET search_path = public;

-- Enable RLS on storage.objects if not already enabled (this is usually handled by Supabase)
-- But we need policies for our new bucket

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'barbershops');
CREATE POLICY "Superadmin Upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'barbershops' AND 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Superadmin Update" ON storage.objects FOR UPDATE USING (
    bucket_id = 'barbershops' AND 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Superadmin Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'barbershops' AND 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
);