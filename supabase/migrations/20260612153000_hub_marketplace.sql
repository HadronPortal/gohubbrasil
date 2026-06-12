-- GoHub marketplace layer.
-- Keeps the current barbershop flow, but adds category/search/distance for hub browsing.

ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'barbershop',
ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) NOT NULL DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS barbershops_business_type_idx
ON public.barbershops(business_type);

CREATE OR REPLACE FUNCTION public.get_hub_businesses(
  p_search text DEFAULT NULL,
  p_business_type text DEFAULT NULL,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  phone text,
  logo_url text,
  cover_url text,
  description text,
  business_type text,
  latitude numeric,
  longitude numeric,
  average_rating numeric,
  rating_count integer,
  min_price numeric,
  services_count integer,
  matched_services text[],
  distance_km numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH service_summary AS (
    SELECT
      s.barbershop_id,
      MIN(s.price) AS min_price,
      COUNT(*)::integer AS services_count,
      ARRAY_AGG(DISTINCT s.name ORDER BY s.name) AS service_names
    FROM public.services s
    GROUP BY s.barbershop_id
  ),
  base AS (
    SELECT
      b.id,
      b.name,
      b.address,
      b.phone,
      b.logo_url,
      b.cover_url,
      b.description,
      COALESCE(NULLIF(b.business_type, ''), 'barbershop') AS business_type,
      b.latitude,
      b.longitude,
      COALESCE(b.average_rating, 5.00) AS average_rating,
      COALESCE(b.rating_count, 0) AS rating_count,
      ss.min_price,
      COALESCE(ss.services_count, 0) AS services_count,
      COALESCE(ss.service_names, ARRAY[]::text[]) AS matched_services,
      CASE
        WHEN p_lat IS NOT NULL
          AND p_lng IS NOT NULL
          AND b.latitude IS NOT NULL
          AND b.longitude IS NOT NULL
        THEN (
          6371 * acos(
            LEAST(
              1,
              GREATEST(
                -1,
                cos(radians(p_lat::double precision))
                * cos(radians(b.latitude::double precision))
                * cos(radians(b.longitude::double precision) - radians(p_lng::double precision))
                + sin(radians(p_lat::double precision))
                * sin(radians(b.latitude::double precision))
              )
            )
          )
        )::numeric
        ELSE NULL
      END AS distance_km
    FROM public.barbershops b
    LEFT JOIN service_summary ss ON ss.barbershop_id = b.id
    WHERE COALESCE(b.blocked, false) = false
      AND (
        p_business_type IS NULL
        OR p_business_type = ''
        OR p_business_type = 'all'
        OR b.business_type = p_business_type
      )
      AND (
        p_search IS NULL
        OR trim(p_search) = ''
        OR b.name ILIKE '%' || trim(p_search) || '%'
        OR b.description ILIKE '%' || trim(p_search) || '%'
        OR b.address ILIKE '%' || trim(p_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.services s
          WHERE s.barbershop_id = b.id
            AND (
              s.name ILIKE '%' || trim(p_search) || '%'
              OR s.description ILIKE '%' || trim(p_search) || '%'
            )
        )
      )
  )
  SELECT *
  FROM base
  ORDER BY
    CASE WHEN distance_km IS NULL THEN 1 ELSE 0 END,
    distance_km ASC NULLS LAST,
    average_rating DESC,
    name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_available_barbershops()
RETURNS SETOF public.barbershops
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.barbershops
  WHERE COALESCE(blocked, false) = false
  ORDER BY name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_hub_businesses(text, text, numeric, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_available_barbershops() TO authenticated, anon;
