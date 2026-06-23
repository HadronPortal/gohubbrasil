CREATE OR REPLACE FUNCTION public.cancel_my_appointment(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid := auth.uid();
  v_appt record;
  v_client_name text;
  v_business_name text;
  v_professional_name text;
  v_professional_user_id uuid;
  v_service_name text;
  v_when text;
  v_owner record;
  v_base_data jsonb;
BEGIN
  SELECT
    a.id,
    a.client_id,
    a.barbershop_id,
    a.barber_id,
    a.service_id,
    a.starts_at,
    a.appointment_time,
    a.status::text AS status
  INTO v_appt
  FROM public.appointments a
  WHERE a.id = p_appointment_id
    AND a.client_id = v_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Agendamento nao encontrado ou nao pertence a voce.'
    );
  END IF;

  IF lower(coalesce(v_appt.status, '')) IN ('cancelled', 'canceled', 'cancelado') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este agendamento ja esta cancelado.'
    );
  END IF;

  SELECT u.name
  INTO v_client_name
  FROM public.users u
  WHERE u.id = v_appt.client_id;

  SELECT b.name
  INTO v_business_name
  FROM public.barbershops b
  WHERE b.id = v_appt.barbershop_id;

  SELECT u.name, br.user_id
  INTO v_professional_name, v_professional_user_id
  FROM public.barbers br
  LEFT JOIN public.users u ON u.id = br.user_id
  WHERE br.id = v_appt.barber_id;

  SELECT s.name
  INTO v_service_name
  FROM public.services s
  WHERE s.id = v_appt.service_id;

  v_when := to_char(
    (coalesce(v_appt.starts_at, v_appt.appointment_time) AT TIME ZONE 'America/Sao_Paulo'),
    'DD/MM/YYYY HH24:MI'
  );

  v_base_data := jsonb_build_object(
    'appointment_id', v_appt.id,
    'barbershop_id', v_appt.barbershop_id,
    'barber_id', v_appt.barber_id,
    'service_id', v_appt.service_id,
    'cancelled_by', 'client'
  );

  UPDATE public.appointments
  SET
    status = 'cancelled',
    confirmed_via_whatsapp = false
  WHERE id = v_appt.id
    AND client_id = v_client_id;

  IF v_professional_user_id IS NOT NULL AND v_professional_user_id <> v_client_id THEN
    PERFORM public.enqueue_push_notification(
      v_professional_user_id,
      'appointment_cancelled_by_client',
      'Cliente cancelou',
      coalesce(v_client_name, 'Cliente') || ' cancelou ' || coalesce(v_service_name, 'um servico') || ' de ' || v_when || '.',
      '/barber-dashboard',
      v_appt.barbershop_id,
      v_appt.id,
      v_base_data,
      now(),
      'appointment-cancelled-by-client-professional-' || v_appt.id::text || '-' || v_professional_user_id::text
    );
  END IF;

  FOR v_owner IN
    SELECT id
    FROM public.users
    WHERE barbershop_id = v_appt.barbershop_id
      AND role::text = 'owner'
      AND id <> v_client_id
      AND (v_professional_user_id IS NULL OR id <> v_professional_user_id)
  LOOP
    PERFORM public.enqueue_push_notification(
      v_owner.id,
      'appointment_cancelled_by_client',
      'Cliente cancelou',
      coalesce(v_client_name, 'Cliente') || ' cancelou horario com ' || coalesce(v_professional_name, 'profissional') || ' de ' || v_when || '.',
      '/admin',
      v_appt.barbershop_id,
      v_appt.id,
      v_base_data,
      now(),
      'appointment-cancelled-by-client-owner-' || v_appt.id::text || '-' || v_owner.id::text
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
