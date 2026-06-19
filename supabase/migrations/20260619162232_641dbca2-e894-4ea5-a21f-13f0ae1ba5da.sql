
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Função de normalização de slug
CREATE OR REPLACE FUNCTION public.normalize_service_slug(p_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(
      lower(public.unaccent(coalesce(p_name, ''))),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  ));
$$;

-- 2. Tabela service_catalog
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon_key text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_category_slug_unique UNIQUE (category_id, slug)
);

GRANT SELECT ON public.service_catalog TO anon, authenticated;
GRANT ALL ON public.service_catalog TO service_role;

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active catalog" ON public.service_catalog;
CREATE POLICY "Anyone can read active catalog" ON public.service_catalog
FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Superadmin manages catalog" ON public.service_catalog;
CREATE POLICY "Superadmin manages catalog" ON public.service_catalog
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin'));

DROP TRIGGER IF EXISTS update_service_catalog_updated_at ON public.service_catalog;
CREATE TRIGGER update_service_catalog_updated_at
BEFORE UPDATE ON public.service_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category_id);

-- 3. Coluna catalog_service_id em services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS catalog_service_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_catalog_service_id ON public.services(catalog_service_id);
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON public.services(barbershop_id);

-- 4. RPC para criar/recuperar item do catálogo
CREATE OR REPLACE FUNCTION public.upsert_catalog_service(p_barbershop_id uuid, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_slug text;
  v_catalog_id uuid;
  v_is_authorized boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (
        role = 'superadmin'
        OR (role = 'owner' AND barbershop_id = p_barbershop_id)
      )
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Não autorizado a cadastrar serviços neste estabelecimento.';
  END IF;

  SELECT category_id INTO v_category_id
    FROM public.barbershops WHERE id = p_barbershop_id;

  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id
      FROM public.business_categories WHERE slug = 'barbearias' LIMIT 1;
  END IF;

  v_slug := public.normalize_service_slug(p_name);
  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'Nome de serviço inválido.';
  END IF;

  SELECT id INTO v_catalog_id
    FROM public.service_catalog
   WHERE category_id = v_category_id AND slug = v_slug;

  IF v_catalog_id IS NULL THEN
    INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
    VALUES (v_category_id, trim(p_name), v_slug, v_slug, true)
    RETURNING id INTO v_catalog_id;
  END IF;

  RETURN v_catalog_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_catalog_service(uuid, text) TO authenticated;

-- 5. RPC de listagem de estabelecimentos por categoria + serviço opcional
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
    COALESCE(c.slug, 'barbearias')::text AS category_slug,
    COALESCE(c.name, 'Barbearias')::text AS category_name
  FROM public.barbershops b
  LEFT JOIN public.business_categories c ON c.id = b.category_id
  WHERE COALESCE(b.blocked, false) = false
    AND (
      p_category_slug IS NULL
      OR p_category_slug = 'todos'
      OR c.slug = p_category_slug
    )
    AND (
      p_catalog_service_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.services s
        WHERE s.barbershop_id = b.id
          AND s.catalog_service_id = p_catalog_service_id
      )
    )
  ORDER BY b.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_barbershops_by_category_service(text, uuid) TO anon, authenticated;

-- 6. Backfill: vincular serviços existentes ao catálogo
DO $$
DECLARE
  r RECORD;
  v_slug text;
  v_catalog_id uuid;
  v_default_cat uuid;
BEGIN
  SELECT id INTO v_default_cat FROM public.business_categories WHERE slug = 'barbearias' LIMIT 1;

  FOR r IN
    SELECT s.id, s.name, COALESCE(b.category_id, v_default_cat) AS category_id
      FROM public.services s
      JOIN public.barbershops b ON b.id = s.barbershop_id
     WHERE s.catalog_service_id IS NULL
  LOOP
    v_slug := public.normalize_service_slug(r.name);
    IF v_slug IS NULL OR v_slug = '' OR r.category_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_catalog_id
      FROM public.service_catalog
     WHERE category_id = r.category_id AND slug = v_slug;

    IF v_catalog_id IS NULL THEN
      INSERT INTO public.service_catalog (category_id, name, slug, icon_key, active)
      VALUES (r.category_id, trim(r.name), v_slug, v_slug, true)
      RETURNING id INTO v_catalog_id;
    END IF;

    UPDATE public.services SET catalog_service_id = v_catalog_id WHERE id = r.id;
  END LOOP;
END $$;
