CREATE OR REPLACE FUNCTION public.get_barber_dashboard(p_day DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_barber_id UUID;
    v_barbershop_id UUID;
    v_commission_pct NUMERIC;
    v_summary JSONB;
    v_today JSONB;
    v_upcoming JSONB;
    v_history JSONB;
BEGIN
    v_user_id := auth.uid();
    
    -- Get barber info
    SELECT id, barbershop_id, COALESCE(commission_pct, 0)
    INTO v_barber_id, v_barbershop_id, v_commission_pct
    FROM public.barbers 
    WHERE user_id = v_user_id AND active = true
    LIMIT 1;

    IF v_barber_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Barbeiro não encontrado ou inativo');
    END IF;

    -- Summary for p_day
    SELECT jsonb_build_object(
        'appointments_today', count(*),
        'gross_today', coalesce(sum(price_charged), 0),
        'commission_today', coalesce(sum(price_charged * (v_commission_pct / 100.0)), 0),
        'commission_pct', v_commission_pct
    ) INTO v_summary
    FROM public.appointments
    WHERE barber_id = v_barber_id
      AND starts_at::date = p_day
      AND status != 'cancelled';

    -- Today's appointments
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_today
    FROM (
        SELECT 
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price_charged,
            coalesce(a.price_charged * (v_commission_pct / 100.0), 0) as commission_value,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND a.starts_at::date = p_day
        ORDER BY a.starts_at ASC
    ) item;

    -- Upcoming (next 7 days after p_day)
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_upcoming
    FROM (
        SELECT 
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price_charged,
            coalesce(a.price_charged * (v_commission_pct / 100.0), 0) as commission_value,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND a.starts_at::date > p_day
          AND a.starts_at::date <= p_day + interval '7 days'
        ORDER BY a.starts_at ASC
    ) item;

    -- History (last 30 days before p_day)
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_history
    FROM (
        SELECT 
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price_charged,
            coalesce(a.price_charged * (v_commission_pct / 100.0), 0) as commission_value,
            a.status
        FROM public.appointments a
        JOIN public.users u ON a.client_id = u.id
        JOIN public.services s ON a.service_id = s.id
        WHERE a.barber_id = v_barber_id
          AND a.starts_at::date < p_day
        ORDER BY a.starts_at DESC
        LIMIT 50
    ) item;

    RETURN jsonb_build_object(
        'success', true,
        'summary', v_summary,
        'today', v_today,
        'upcoming', v_upcoming,
        'history', v_history
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;