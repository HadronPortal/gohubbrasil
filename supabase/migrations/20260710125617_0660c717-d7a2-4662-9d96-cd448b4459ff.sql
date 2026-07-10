CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected',
  phone_number text,
  pairing_code text,
  code_expires_at timestamptz,
  qr_code text,
  qr_expires_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_connections TO authenticated;
GRANT ALL ON public.whatsapp_connections TO service_role;

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own barbershop whatsapp connection"
  ON public.whatsapp_connections FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (SELECT barbershop_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Owners can insert own barbershop whatsapp connection"
  ON public.whatsapp_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id IN (SELECT barbershop_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Owners can update own barbershop whatsapp connection"
  ON public.whatsapp_connections FOR UPDATE
  TO authenticated
  USING (
    barbershop_id IN (SELECT barbershop_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    barbershop_id IN (SELECT barbershop_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE OR REPLACE FUNCTION public.set_updated_at_whatsapp_connections()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER trg_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_whatsapp_connections();