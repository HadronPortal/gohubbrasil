CREATE OR REPLACE FUNCTION public.get_owner_dashboard_appointments(p_day DATE)
RETURNS TABLE (
    client_name TEXT,
    barber_name TEXT,
    service_name TEXT,
    starts_at TIMESTAMPTZ,
    price_charged NUMERIC,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_barbershop_id UUID;
BEGIN
    -- Get barbershop_id for the current user
    SELECT barbershop_id INTO v_barbershop_id
    FROM public.users
    WHERE id = auth.uid();

    IF v_barbershop_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        v.client_name,
        v.barber_name,
        v.service_name,
        v.starts_at,
        v.price_charged,
        v.status
    FROM public.owner_appointments_view v
    WHERE v.barbershop_id = v_barbershop_id
      AND DATE(v.starts_at) = p_day
      AND v.status != 'cancelled'
    ORDER BY v.starts_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_dashboard_appointments(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_dashboard_appointments(DATE) TO service_role;