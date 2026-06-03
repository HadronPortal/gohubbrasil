-- Adiciona colunas necessárias se não existirem
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS price NUMERIC;

-- Atualiza get_barber_dashboard para usar as novas regras e retornar IDs
CREATE OR REPLACE FUNCTION public.get_barber_dashboard(p_day DATE)
RETURNS JSONB AS $$
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
    -- Comissão hoje: apenas atendimentos completados (preferencialmente com commission_amount já gravado)
    SELECT jsonb_build_object(
        'appointments_today', count(*),
        'gross_today', coalesce(sum(price_charged), 0),
        'commission_today', coalesce(
            sum(
                CASE 
                    WHEN status = 'completed' THEN COALESCE(commission_amount, price_charged * (v_commission_pct / 100.0))
                    ELSE 0 
                END
            ), 0
        ),
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
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
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
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
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
            a.id,
            u.name as client_name,
            u.phone as client_phone,
            s.name as service_name,
            a.starts_at,
            a.price,
            a.price_charged,
            COALESCE(a.commission_amount, a.price_charged * (v_commission_pct / 100.0)) as commission_amount,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- finish_barber_appointment
CREATE OR REPLACE FUNCTION public.finish_barber_appointment(p_appointment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_barber_id UUID;
    v_commission_pct NUMERIC;
    v_price_charged NUMERIC;
    v_commission_amount NUMERIC;
BEGIN
    v_user_id := auth.uid();

    -- Check if appointment exists and belongs to the barber
    SELECT a.barber_id, a.price_charged, b.commission_pct
    INTO v_barber_id, v_price_charged, v_commission_pct
    FROM public.appointments a
    JOIN public.barbers b ON a.barber_id = b.id
    WHERE a.id = p_appointment_id AND b.user_id = v_user_id;

    IF v_barber_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado ou sem permissão');
    END IF;

    -- Calculate commission
    v_commission_amount := v_price_charged * (COALESCE(v_commission_pct, 0) / 100.0);

    -- Update appointment
    UPDATE public.appointments
    SET status = 'completed',
        price = v_price_charged,
        commission_amount = v_commission_amount
    WHERE id = p_appointment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'price', v_price_charged, 
        'commission_amount', v_commission_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;