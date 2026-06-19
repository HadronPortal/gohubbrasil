CREATE TABLE IF NOT EXISTS public.barbershop_categories (
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (barbershop_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_barbershop_categories_category
  ON public.barbershop_categories(category_id, barbershop_id);

INSERT INTO public.barbershop_categories (barbershop_id, category_id)
SELECT id, category_id
FROM public.barbershops
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.barbershop_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.barbershop_categories TO anon, authenticated;
GRANT ALL ON public.barbershop_categories TO service_role;

DROP POLICY IF EXISTS "Business categories are readable by everyone"
  ON public.barbershop_categories;
CREATE POLICY "Business categories are readable by everyone"
ON public.barbershop_categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Superadmins manage business categories"
  ON public.barbershop_categories;
CREATE POLICY "Superadmins manage business categories"
ON public.barbershop_categories FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

CREATE OR REPLACE FUNCTION public.get_barbershops_by_category_service(
  p_category_slug text,
  p_catalog_service_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name text, address text, phone text, logo_url text,
  description text, latitude double precision, longitude double precision,
  blocked boolean, subscription_status text, created_at timestamptz,
  category_id uuid, category_slug text, category_name text
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
    b.category_id,
    COALESCE(primary_category.slug, 'barbearias')::text,
    COALESCE(primary_category.name, 'Barbearias')::text
  FROM public.barbershops b
  LEFT JOIN public.business_categories primary_category
    ON primary_category.id = b.category_id
  WHERE COALESCE(b.blocked, false) = false
    AND (
      p_category_slug IS NULL
      OR p_category_slug = 'todos'
      OR primary_category.slug = p_category_slug
      OR EXISTS (
        SELECT 1
        FROM public.barbershop_categories link
        JOIN public.business_categories linked_category
          ON linked_category.id = link.category_id
        WHERE link.barbershop_id = b.id
          AND linked_category.slug = p_category_slug
      )
    )
    AND (
      p_catalog_service_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.services service
        WHERE service.barbershop_id = b.id
          AND service.catalog_service_id = p_catalog_service_id
          AND COALESCE(service.active, true) = true
      )
    )
  ORDER BY b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_barbershops_by_category_service(text, uuid)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
