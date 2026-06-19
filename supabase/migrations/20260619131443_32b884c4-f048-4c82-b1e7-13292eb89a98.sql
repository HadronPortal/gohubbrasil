
-- Backfill any leftover NULL category_id to "barbearias"
UPDATE public.barbershops b
   SET category_id = c.id
  FROM public.business_categories c
 WHERE c.slug = 'barbearias'
   AND b.category_id IS NULL;

-- Refresh RPC with COALESCE fallback for category_slug/name
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
    b.category_id,
    COALESCE(c.slug, 'barbearias') AS category_slug,
    COALESCE(c.name, 'Barbearias') AS category_name
  FROM public.barbershops b
  LEFT JOIN public.business_categories c ON c.id = b.category_id
  WHERE COALESCE(b.blocked, false) = false
  ORDER BY b.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_barbershops() TO anon, authenticated;
