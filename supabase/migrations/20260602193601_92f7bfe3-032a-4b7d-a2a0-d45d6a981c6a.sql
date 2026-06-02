CREATE OR REPLACE FUNCTION public.cancel_my_appointment(p_appointment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id UUID;
    v_status TEXT;
BEGIN
    -- Get caller ID
    v_client_id := auth.uid();
    
    -- Check if appointment exists and belongs to client
    SELECT status INTO v_status
    FROM public.appointments
    WHERE id = p_appointment_id AND client_id = v_client_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado ou não pertence a você.');
    END IF;
    
    IF v_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este agendamento já está cancelado.');
    END IF;

    -- Update status
    UPDATE public.appointments
    SET status = 'cancelled'
    WHERE id = p_appointment_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(UUID) TO authenticated;
