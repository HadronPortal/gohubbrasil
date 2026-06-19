
-- 1. Catalog table
CREATE TABLE IF NOT EXISTS public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_categories' AND policyname='Categories are readable by everyone') THEN
    CREATE POLICY "Categories are readable by everyone" ON public.business_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_categories' AND policyname='Only superadmins can manage categories') THEN
    CREATE POLICY "Only superadmins can manage categories" ON public.business_categories
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin'));
  END IF;
END $$;

-- Seed
INSERT INTO public.business_categories (slug, name) VALUES
  ('barbearias', 'Barbearias'),
  ('cabelos', 'Cabelos'),
  ('unhas', 'Unhas'),
  ('estetica', 'Estética'),
  ('massoterapia', 'Massoterapia'),
  ('sobrancelhas', 'Sobrancelhas'),
  ('maquiagem', 'Maquiagem'),
  ('depilacao', 'Depilação'),
  ('podologia', 'Podologia')
ON CONFLICT (slug) DO NOTHING;

-- 2. Add FK column to barbershops
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.business_categories(id);

-- Backfill existing barbershops to "barbearias"
UPDATE public.barbershops
  SET category_id = (SELECT id FROM public.business_categories WHERE slug = 'barbearias')
  WHERE category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_barbershops_category_id ON public.barbershops(category_id);

-- 3. Updated RPC: return all needed fields + category info
DROP FUNCTION IF EXISTS public.get_available_barbershops();

CREATE OR REPLACE FUNCTION public.get_available_barbershops()
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  phone text,
  logo_url text,
  description text,
  latitude double precision,
  longitude double precision,
  blocked boolean,
  subscription_status text,
  created_at timestamptz,
  category_id uuid,
  category_slug text,
  category_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.phone, b.logo_url, b.description,
    b.latitude, b.longitude, b.blocked, b.subscription_status, b.created_at,
    c.id AS category_id, c.slug AS category_slug, c.name AS category_name
  FROM public.barbershops b
  LEFT JOIN public.business_categories c ON c.id = b.category_id
  WHERE COALESCE(b.blocked, false) = false
  ORDER BY b.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_barbershops() TO anon, authenticated;
