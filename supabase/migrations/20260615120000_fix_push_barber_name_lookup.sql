CREATE OR REPLACE FUNCTION public.enqueue_appointment_push_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_barbershop_name text;
  v_barber_name text;
  v_barber_user_id uuid;
  v_service_name text;
  v_when text;
  v_owner record;
  v_status text;
  v_old_status text;
  v_base_data jsonb;
BEGIN
  SELECT u.name INTO v_client_name
  FROM public.users u
  WHERE u.id = NEW.client_id;

  SELECT bs.name INTO v_barbershop_name
  FROM public.barbershops bs
  WHERE bs.id = NEW.barbershop_id;

  SELECT u_barber.name, b.user_id
  INTO v_barber_name, v_barber_user_id
  FROM public.barbers b
  LEFT JOIN public.users u_barber ON u_barber.id = b.user_id
  WHERE b.id = NEW.barber_id;

  SELECT s.name INTO v_service_name
  FROM public.services s
  WHERE s.id = NEW.service_id;

  v_when := to_char((COALESCE(NEW.starts_at, NEW.appointment_time) AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY HH24:MI');
  v_status := lower(COALESCE(NEW.status::text, 'pending'));
  v_base_data := jsonb_build_object(
    'appointment_id', NEW.id,
    'barbershop_id', NEW.barbershop_id,
    'barber_id', NEW.barber_id,
    'service_id', NEW.service_id
  );

  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_push_notification(
      NEW.client_id,
      'appointment_created',
      'Horario agendado',
      'Seu horario em ' || COALESCE(v_barbershop_name, 'sua barbearia') || ' foi marcado para ' || v_when || '.',
      '/client-home',
      NEW.barbershop_id,
      NEW.id,
      v_base_data,
      now(),
      'appointment-created-client-' || NEW.id::text
    );

    IF v_barber_user_id IS NOT NULL AND v_barber_user_id <> NEW.client_id THEN
      PERFORM public.enqueue_push_notification(
        v_barber_user_id,
        'appointment_created_barber',
        'Novo agendamento',
        COALESCE(v_client_name, 'Cliente') || ' marcou ' || COALESCE(v_service_name, 'um servico') || ' para ' || v_when || '.',
        '/barber-dashboard',
        NEW.barbershop_id,
        NEW.id,
        v_base_data,
        now(),
        'appointment-created-barber-' || NEW.id::text || '-' || v_barber_user_id::text
      );
    END IF;

    FOR v_owner IN
      SELECT id
      FROM public.users
      WHERE barbershop_id = NEW.barbershop_id
        AND role = 'owner'
        AND id <> NEW.client_id
        AND (v_barber_user_id IS NULL OR id <> v_barber_user_id)
    LOOP
      PERFORM public.enqueue_push_notification(
        v_owner.id,
        'appointment_created_owner',
        'Novo agendamento',
        COALESCE(v_client_name, 'Cliente') || ' marcou horario com ' || COALESCE(v_barber_name, 'barbeiro') || ' para ' || v_when || '.',
        '/admin',
        NEW.barbershop_id,
        NEW.id,
        v_base_data,
        now(),
        'appointment-created-owner-' || NEW.id::text || '-' || v_owner.id::text
      );
    END LOOP;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_status := lower(COALESCE(OLD.status::text, ''));

    IF v_status IN ('cancelled', 'canceled', 'cancelado') AND v_old_status NOT IN ('cancelled', 'canceled', 'cancelado') THEN
      PERFORM public.enqueue_push_notification(
        NEW.client_id,
        'appointment_cancelled',
        'Horario cancelado',
        'Seu horario em ' || COALESCE(v_barbershop_name, 'sua barbearia') || ' de ' || v_when || ' foi cancelado.',
        '/client-home',
        NEW.barbershop_id,
        NEW.id,
        v_base_data,
        now(),
        'appointment-cancelled-client-' || NEW.id::text
      );
    END IF;

    IF (
      (COALESCE(OLD.confirmed_via_whatsapp, false) = false AND COALESCE(NEW.confirmed_via_whatsapp, false) = true)
      OR (v_status = 'confirmed' AND v_old_status <> 'confirmed')
    ) THEN
      IF v_barber_user_id IS NOT NULL AND v_barber_user_id <> NEW.client_id THEN
        PERFORM public.enqueue_push_notification(
          v_barber_user_id,
          'appointment_confirmed_barber',
          'Cliente confirmou',
          COALESCE(v_client_name, 'Cliente') || ' confirmou o horario de ' || v_when || '.',
          '/barber-dashboard',
          NEW.barbershop_id,
          NEW.id,
          v_base_data,
          now(),
          'appointment-confirmed-barber-' || NEW.id::text || '-' || v_barber_user_id::text
        );
      END IF;

      FOR v_owner IN
        SELECT id
        FROM public.users
        WHERE barbershop_id = NEW.barbershop_id
          AND role = 'owner'
          AND id <> NEW.client_id
          AND (v_barber_user_id IS NULL OR id <> v_barber_user_id)
      LOOP
        PERFORM public.enqueue_push_notification(
          v_owner.id,
          'appointment_confirmed_owner',
          'Cliente confirmou',
          COALESCE(v_client_name, 'Cliente') || ' confirmou horario com ' || COALESCE(v_barber_name, 'barbeiro') || ' de ' || v_when || '.',
          '/admin',
          NEW.barbershop_id,
          NEW.id,
          v_base_data,
          now(),
          'appointment-confirmed-owner-' || NEW.id::text || '-' || v_owner.id::text
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
