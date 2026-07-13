
-- Create barbershop_clients relationship table
CREATE TABLE IF NOT EXISTS public.barbershop_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  first_appointment_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_appointment_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershop_clients TO authenticated;
GRANT ALL ON public.barbershop_clients TO service_role;

ALTER TABLE public.barbershop_clients ENABLE ROW LEVEL SECURITY;

-- Client can see/insert own linkage
CREATE POLICY "Clients manage own linkage"
ON public.barbershop_clients
FOR ALL
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- Owners/superadmins/barbers of the shop can view clients of their shop
CREATE POLICY "Shop staff can view clients"
ON public.barbershop_clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'superadmin'
        OR (u.role IN ('owner','barber') AND u.barbershop_id = barbershop_clients.barbershop_id)
      )
  )
);

CREATE TRIGGER update_barbershop_clients_updated_at
BEFORE UPDATE ON public.barbershop_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to upsert linkage using profile data (SECURITY DEFINER, restricted to caller = client_id)
CREATE OR REPLACE FUNCTION public.link_client_to_barbershop(p_barbershop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_phone TEXT;
  v_avatar TEXT;
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'não autenticado');
  END IF;
  IF p_barbershop_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'barbershop_id obrigatório');
  END IF;

  SELECT u.name, u.phone, u.avatar_url INTO v_name, v_phone, v_avatar
  FROM public.users u WHERE u.id = v_uid;

  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = v_uid;

  INSERT INTO public.barbershop_clients (barbershop_id, client_id, name, phone, email, avatar_url)
  VALUES (p_barbershop_id, v_uid, v_name, v_phone, v_email, v_avatar)
  ON CONFLICT (barbershop_id, client_id) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, barbershop_clients.name),
        phone = COALESCE(EXCLUDED.phone, barbershop_clients.phone),
        email = COALESCE(EXCLUDED.email, barbershop_clients.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, barbershop_clients.avatar_url),
        last_appointment_at = now(),
        updated_at = now();

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_client_to_barbershop(UUID) TO authenticated;
