
-- Manual appointment creation for owner/barber
CREATE OR REPLACE FUNCTION public.search_clients_for_manual_booking(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop uuid;
  v_is_authorized boolean;
  v_q text;
  v_result jsonb;
BEGIN
  SELECT public._resolve_my_barbershop(NULL) INTO v_barbershop;
  IF v_barbershop IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estabelecimento não identificado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'superadmin' OR ((u.role IN ('owner','barber')) AND u.barbershop_id = v_barbershop))
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  v_q := '%' || lower(coalesce(p_query, '')) || '%';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', u.id, 'name', u.name, 'phone', u.phone
  )), '[]'::jsonb)
  INTO v_result
  FROM public.users u
  WHERE u.role = 'client'
    AND (lower(coalesce(u.name,'')) LIKE v_q OR coalesce(u.phone,'') LIKE '%' || coalesce(p_query,'') || '%')
  LIMIT 20;

  RETURN jsonb_build_object('success', true, 'clients', v_result);
END; $$;

GRANT EXECUTE ON FUNCTION public.search_clients_for_manual_booking(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_manual_appointment(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_id uuid DEFAULT NULL,
  p_client_name text DEFAULT NULL,
  p_client_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bs uuid;
  v_is_authorized boolean;
  v_duration int;
  v_price numeric;
  v_ends_at timestamptz;
  v_client uuid;
  v_conflict int;
  v_appointment_id uuid;
BEGIN
  v_bs := public._resolve_my_barbershop(p_barbershop_id);
  IF v_bs IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estabelecimento não identificado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'superadmin'
        OR ((u.role = 'owner') AND u.barbershop_id = v_bs)
        OR ((u.role = 'barber') AND u.barbershop_id = v_bs)
      )
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para criar agendamento');
  END IF;

  IF p_barber_id IS NULL OR p_service_id IS NULL OR p_starts_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dados incompletos');
  END IF;

  -- If barber role, only allow booking for own barber_id
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'barber') THEN
    IF NOT EXISTS (SELECT 1 FROM public.barbers WHERE id = p_barber_id AND user_id = auth.uid()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Profissional só pode agendar para si');
    END IF;
  END IF;

  SELECT duration_minutes, price INTO v_duration, v_price
  FROM public.services WHERE id = p_service_id AND barbershop_id = v_bs;
  IF v_duration IS NULL THEN v_duration := 30; END IF;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  -- Resolve or create client
  IF p_client_id IS NOT NULL THEN
    v_client := p_client_id;
  ELSIF p_client_phone IS NOT NULL AND length(trim(p_client_phone)) > 0 THEN
    SELECT id INTO v_client FROM public.users
    WHERE role = 'client' AND phone = p_client_phone LIMIT 1;

    IF v_client IS NULL THEN
      -- create a placeholder client user (no auth account) - reuse gen_random_uuid
      v_client := gen_random_uuid();
      INSERT INTO public.users (id, name, phone, role)
      VALUES (v_client, COALESCE(NULLIF(trim(p_client_name), ''), 'Cliente'), p_client_phone, 'client');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Informe o cliente ou WhatsApp');
  END IF;

  -- Conflict check
  SELECT COUNT(*) INTO v_conflict FROM public.appointments a
  WHERE a.barbershop_id = v_bs
    AND a.barber_id = p_barber_id
    AND COALESCE(a.status, 'scheduled') NOT IN ('cancelled','canceled','cancelado','no_show')
    AND COALESCE(a.starts_at, a.appointment_time) < v_ends_at
    AND COALESCE(a.ends_at, COALESCE(a.starts_at, a.appointment_time) + make_interval(mins => v_duration)) > p_starts_at;
  IF v_conflict > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Horário indisponível');
  END IF;

  INSERT INTO public.appointments (
    client_id, barbershop_id, service_id, barber_id,
    starts_at, ends_at, appointment_time, status, price_charged, price
  ) VALUES (
    v_client, v_bs, p_service_id, p_barber_id,
    p_starts_at, v_ends_at, p_starts_at, 'pending', v_price, v_price
  ) RETURNING id INTO v_appointment_id;

  -- Enqueue whatsapp (best-effort)
  BEGIN
    PERFORM public.enqueue_whatsapp_for_appointment(v_appointment_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id, 'client_id', v_client);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_manual_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text) TO authenticated;
