-- Add new columns to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_attended BOOLEAN DEFAULT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ DEFAULT NULL;

-- Update finish_barber_appointment RPC
DROP FUNCTION IF EXISTS public.finish_barber_appointment(UUID);
CREATE OR REPLACE FUNCTION public.finish_barber_appointment(p_appointment_id UUID, p_attended BOOLEAN)
RETURNS JSON AS $$
DECLARE
  v_appt RECORD;
  v_commission_pct NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  SELECT a.*, b.commission_pct INTO v_appt
  FROM appointments a
  JOIN barbers b ON a.barber_id = b.id
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;

  IF v_appt.status IN ('cancelled', 'canceled', 'cancelado') THEN
    RETURN json_build_object('success', false, 'error', 'Agendamento já está cancelado');
  END IF;

  IF p_attended THEN
    v_commission_amount := (COALESCE(v_appt.price_charged, v_appt.price, 0) * COALESCE(v_appt.commission_pct, 0)) / 100;
    
    UPDATE appointments 
    SET status = 'completed',
        client_attended = true,
        finished_at = now(),
        commission_amount = v_commission_amount,
        updated_at = now()
    WHERE id = p_appointment_id;
  ELSE
    UPDATE appointments 
    SET status = 'no_show',
        client_attended = false,
        finished_at = now(),
        commission_amount = 0,
        updated_at = now()
    WHERE id = p_appointment_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update finish_appointment_by_owner RPC
DROP FUNCTION IF EXISTS public.finish_appointment_by_owner(UUID);
CREATE OR REPLACE FUNCTION public.finish_appointment_by_owner(p_appointment_id UUID, p_attended BOOLEAN)
RETURNS JSON AS $$
BEGIN
  -- Reuses the same logic as barber finish for consistency
  RETURN public.finish_barber_appointment(p_appointment_id, p_attended);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_owner_financial_report to filter by client_attended = true
CREATE OR REPLACE FUNCTION public.get_owner_financial_report(p_start_date DATE, p_end_date DATE, p_barbershop_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_barbershop_id UUID;
    v_summary JSON;
    v_barbers JSON;
    v_services JSON;
BEGIN
    -- Se p_barbershop_id for nulo, tenta pegar da tabela users do usuário logado
    IF p_barbershop_id IS NULL THEN
        SELECT barbershop_id INTO v_barbershop_id FROM public.users WHERE id = auth.uid();
    ELSE
        v_barbershop_id := p_barbershop_id;
    END IF;

    -- Resumo Geral (Apenas completed + attended)
    SELECT json_build_object(
        'gross', COALESCE(SUM(COALESCE(price_charged, price, 0)), 0),
        'commission', COALESCE(SUM(commission_amount), 0),
        'net', COALESCE(SUM(COALESCE(price_charged, price, 0)) - SUM(COALESCE(commission_amount, 0)), 0),
        'completed_count', COUNT(*),
        'cancelled_count', (SELECT COUNT(*) FROM appointments WHERE barbershop_id = v_barbershop_id AND status IN ('cancelled', 'canceled', 'cancelado', 'no_show') AND starts_at::DATE BETWEEN p_start_date AND p_end_date),
        'average_ticket', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(COALESCE(price_charged, price, 0)), 0) / COUNT(*) ELSE 0 END
    ) INTO v_summary
    FROM appointments
    WHERE barbershop_id = v_barbershop_id
      AND status = 'completed'
      AND client_attended = true
      AND starts_at::DATE BETWEEN p_start_date AND p_end_date;

    -- Ranking de Barbeiros (Apenas completed + attended)
    SELECT json_agg(t) INTO v_barbers
    FROM (
        SELECT 
            b.name,
            COUNT(a.id) as completed_count,
            SUM(COALESCE(a.price_charged, a.price, 0)) as gross,
            SUM(a.commission_amount) as commission,
            SUM(COALESCE(a.price_charged, a.price, 0)) - SUM(COALESCE(a.commission_amount, 0)) as net
        FROM appointments a
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barbershop_id = v_barbershop_id
          AND a.status = 'completed'
          AND a.client_attended = true
          AND a.starts_at::DATE BETWEEN p_start_date AND p_end_date
        GROUP BY b.name
        ORDER BY gross DESC
    ) t;

    -- Ranking de Serviços (Apenas completed + attended)
    SELECT json_agg(t) INTO v_services
    FROM (
        SELECT 
            service_name as name,
            COUNT(*) as quantity,
            SUM(COALESCE(price_charged, price, 0)) as total_revenue
        FROM appointments
        WHERE barbershop_id = v_barbershop_id
          AND status = 'completed'
          AND client_attended = true
          AND starts_at::DATE BETWEEN p_start_date AND p_end_date
        GROUP BY service_name
        ORDER BY quantity DESC
    ) t;

    RETURN json_build_object(
        'success', true,
        'summary', v_summary,
        'barbers', COALESCE(v_barbers, '[]'::json),
        'services', COALESCE(v_services, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_barber_dashboard summary
CREATE OR REPLACE FUNCTION public.get_barber_dashboard(p_day DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_barber_id UUID;
    v_barbershop_id UUID;
    v_summary JSON;
    v_today_appointments JSON;
    v_upcoming_appointments JSON;
    v_history_appointments JSON;
    v_target_date DATE := COALESCE(p_day, CURRENT_DATE);
BEGIN
    -- Pega o ID do barbeiro vinculado ao usuário logado
    SELECT id, barbershop_id INTO v_barber_id, v_barbershop_id FROM public.barbers WHERE user_id = auth.uid();

    IF v_barber_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Perfil de barbeiro não encontrado');
    END IF;

    -- Resumo (Apenas completed + attended para faturamento)
    SELECT json_build_object(
        'appointments_today', (SELECT COUNT(*) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status NOT IN ('cancelled', 'canceled', 'cancelado', 'no_show')),
        'gross_today', COALESCE((SELECT SUM(COALESCE(price_charged, price, 0)) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status = 'completed' AND client_attended = true), 0),
        'commission_today', COALESCE((SELECT SUM(commission_amount) FROM appointments WHERE barber_id = v_barber_id AND starts_at::DATE = v_target_date AND status = 'completed' AND client_attended = true), 0),
        'commission_pct', (SELECT commission_pct FROM barbers WHERE id = v_barber_id)
    ) INTO v_summary;

    -- Agendamentos de Hoje (Pendentes ou Confirmados)
    SELECT json_agg(t) INTO v_today_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND starts_at::DATE = v_target_date
          AND status IN ('pending', 'confirmed')
        ORDER BY starts_at ASC
    ) t;

    -- Próximos Agendamentos (Pendentes ou Confirmados, futuros)
    SELECT json_agg(t) INTO v_upcoming_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND starts_at::DATE > v_target_date
          AND status IN ('pending', 'confirmed')
        ORDER BY starts_at ASC
        LIMIT 20
    ) t;

    -- Histórico (Finalizados, No-show ou Cancelados)
    SELECT json_agg(t) INTO v_history_appointments
    FROM (
        SELECT * FROM appointments 
        WHERE barber_id = v_barber_id 
          AND (status IN ('completed', 'cancelled', 'canceled', 'cancelado', 'no_show') OR starts_at < now() - interval '1 hour')
        ORDER BY starts_at DESC
        LIMIT 30
    ) t;

    RETURN json_build_object(
        'success', true,
        'summary', v_summary,
        'today', COALESCE(v_today_appointments, '[]'::json),
        'upcoming', COALESCE(v_upcoming_appointments, '[]'::json),
        'history', COALESCE(v_history_appointments, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable auto_complete_past_appointments by making it a no-op
DROP FUNCTION IF EXISTS public.auto_complete_past_appointments();
CREATE OR REPLACE FUNCTION public.auto_complete_past_appointments()
RETURNS VOID AS $$
BEGIN
  -- Logic removed as requested. No more automatic completion.
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
