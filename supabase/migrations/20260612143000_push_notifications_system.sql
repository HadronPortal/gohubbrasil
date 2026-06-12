-- Push notification system for GoHub.
-- Run this in Supabase SQL editor before deploying the send-push Edge Function.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token text;

CREATE OR REPLACE FUNCTION public.save_my_push_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario nao autenticado');
  END IF;

  UPDATE public.users
  SET push_token = NULLIF(trim(p_token), ''),
      updated_at = now()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.users (id, role, push_token, created_at, updated_at)
    VALUES (auth.uid(), 'client', NULLIF(trim(p_token), ''), now(), now())
    ON CONFLICT (id) DO UPDATE
    SET push_token = excluded.push_token,
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barbershop_id uuid NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  appointment_id uuid NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  path text NOT NULL DEFAULT '/',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_after timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text NULL,
  firebase_message_id text NULL,
  processing_started_at timestamptz NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text NULL,
  CONSTRAINT push_notification_queue_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped'))
);

CREATE UNIQUE INDEX IF NOT EXISTS push_notification_queue_dedupe_key_idx
ON public.push_notification_queue(dedupe_key)
WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS push_notification_queue_pending_idx
ON public.push_notification_queue(status, send_after, created_at)
WHERE status = 'pending';

ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push notifications" ON public.push_notification_queue;
CREATE POLICY "Users can view own push notifications"
ON public.push_notification_queue
FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enqueue_push_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_path text DEFAULT '/',
  p_barbershop_id uuid DEFAULT NULL,
  p_appointment_id uuid DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_send_after timestamptz DEFAULT now(),
  p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.push_notification_queue (
    user_id,
    barbershop_id,
    appointment_id,
    type,
    title,
    body,
    path,
    data,
    send_after,
    dedupe_key
  )
  VALUES (
    p_user_id,
    p_barbershop_id,
    p_appointment_id,
    p_type,
    p_title,
    p_body,
    COALESCE(NULLIF(p_path, ''), '/'),
    COALESCE(p_data, '{}'::jsonb),
    COALESCE(p_send_after, now()),
    p_dedupe_key
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.push_notification_queue
    WHERE dedupe_key = p_dedupe_key
    LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_pending_push_notifications(p_limit integer DEFAULT 25)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  body text,
  path text,
  type text,
  data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
    FROM public.push_notification_queue q
    WHERE q.status = 'pending'
      AND q.send_after <= now()
    ORDER BY q.send_after ASC, q.created_at ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.push_notification_queue q
  SET status = 'processing',
      attempts = q.attempts + 1,
      processing_started_at = now(),
      updated_at = now()
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING q.id, q.user_id, q.title, q.body, q.path, q.type, q.data;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_failed_push_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.push_notification_queue
  SET status = 'pending',
      send_after = now() + interval '5 minutes',
      updated_at = now()
  WHERE status IN ('processing', 'failed')
    AND attempts < 3
    AND updated_at < now() - interval '5 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

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

  SELECT b.name INTO v_barbershop_name
  FROM public.barbershops b
  WHERE b.id = NEW.barbershop_id;

  SELECT b.name, b.user_id INTO v_barber_name, v_barber_user_id
  FROM public.barbers b
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

DROP TRIGGER IF EXISTS trg_appointment_push_insert ON public.appointments;
CREATE TRIGGER trg_appointment_push_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_appointment_push_notifications();

DROP TRIGGER IF EXISTS trg_appointment_push_update ON public.appointments;
CREATE TRIGGER trg_appointment_push_update
AFTER UPDATE OF status, confirmed_via_whatsapp ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_appointment_push_notifications();

CREATE OR REPLACE FUNCTION public.enqueue_haircut_return_reminders(p_days_after integer DEFAULT 14)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_appt record;
BEGIN
  FOR v_appt IN
    SELECT DISTINCT ON (a.client_id, a.barbershop_id)
      a.id,
      a.client_id,
      a.barbershop_id,
      b.name AS barbershop_name,
      a.starts_at
    FROM public.appointments a
    JOIN public.barbershops b ON b.id = a.barbershop_id
    WHERE a.status = 'completed'
      AND COALESCE(a.client_attended, true) = true
      AND (a.starts_at AT TIME ZONE 'America/Sao_Paulo')::date = ((now() AT TIME ZONE 'America/Sao_Paulo')::date - COALESCE(p_days_after, 14))
      AND NOT EXISTS (
        SELECT 1
        FROM public.appointments future
        WHERE future.client_id = a.client_id
          AND future.barbershop_id = a.barbershop_id
          AND future.starts_at > now()
          AND lower(COALESCE(future.status::text, 'pending')) NOT IN ('cancelled', 'canceled', 'cancelado', 'completed', 'no_show')
      )
    ORDER BY a.client_id, a.barbershop_id, a.starts_at DESC
  LOOP
    PERFORM public.enqueue_push_notification(
      v_appt.client_id,
      'haircut_return_reminder',
      'Hora de agendar de novo',
      'Ja faz ' || COALESCE(p_days_after, 14)::text || ' dias desde seu ultimo atendimento em ' || COALESCE(v_appt.barbershop_name, 'sua barbearia') || '.',
      '/client-home',
      v_appt.barbershop_id,
      v_appt.id,
      jsonb_build_object('appointment_id', v_appt.id, 'days_after', COALESCE(p_days_after, 14)),
      now(),
      'haircut-return-' || v_appt.client_id::text || '-' || v_appt.barbershop_id::text || '-' || to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_subscription_due_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_shop record;
  v_owner record;
  v_days_left integer;
  v_title text;
  v_body text;
BEGIN
  FOR v_shop IN
    SELECT *
    FROM public.barbershops
    WHERE paid_until IS NOT NULL
      AND paid_until BETWEEN (now() AT TIME ZONE 'America/Sao_Paulo')::date
                         AND (now() AT TIME ZONE 'America/Sao_Paulo')::date + 7
  LOOP
    v_days_left := v_shop.paid_until - (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    v_title := CASE
      WHEN v_days_left = 0 THEN 'Mensalidade vence hoje'
      WHEN v_days_left = 1 THEN 'Mensalidade vence amanha'
      ELSE 'Mensalidade perto do vencimento'
    END;
    v_body := CASE
      WHEN v_days_left = 0 THEN 'A mensalidade da ' || v_shop.name || ' vence hoje.'
      WHEN v_days_left = 1 THEN 'A mensalidade da ' || v_shop.name || ' vence amanha.'
      ELSE 'A mensalidade da ' || v_shop.name || ' vence em ' || v_days_left::text || ' dias.'
    END;

    IF v_days_left IN (0, 1, 3, 7) THEN
      FOR v_owner IN
        SELECT id
        FROM public.users
        WHERE barbershop_id = v_shop.id
          AND role = 'owner'
      LOOP
        PERFORM public.enqueue_push_notification(
          v_owner.id,
          'subscription_due',
          v_title,
          v_body,
          '/admin',
          v_shop.id,
          NULL,
          jsonb_build_object('barbershop_id', v_shop.id, 'paid_until', v_shop.paid_until, 'days_left', v_days_left),
          now(),
          'subscription-due-' || v_shop.id::text || '-' || v_owner.id::text || '-' || v_days_left::text || '-' || to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD')
        );

        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_my_push_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_push_notification(uuid, text, text, text, text, uuid, uuid, jsonb, timestamptz, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_notifications(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_failed_push_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_haircut_return_reminders(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_subscription_due_reminders() TO service_role;

GRANT SELECT ON public.push_notification_queue TO authenticated;
GRANT ALL ON public.push_notification_queue TO service_role;
