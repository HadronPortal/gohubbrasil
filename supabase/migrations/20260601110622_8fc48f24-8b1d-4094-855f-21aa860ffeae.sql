CREATE OR REPLACE FUNCTION public.delete_barber(p_barber_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_success BOOLEAN := FALSE;
    v_error_msg TEXT;
BEGIN
    -- 1. Cancelar agendamentos futuros pendentes
    UPDATE public.appointments
    SET status = 'cancelled'
    WHERE barber_id = p_barber_id
      AND appointment_date >= CURRENT_DATE
      AND status = 'pending';

    -- 2. Deletar o barbeiro
    -- Nota: Se houver FKs com ON DELETE RESTRICT, isso pode falhar. 
    -- Se houver perfis vinculados, o trigger ou política deve lidar ou deletamos aqui se necessário.
    DELETE FROM public.barbers
    WHERE id = p_barber_id;

    v_success := TRUE;
    
    RETURN jsonb_build_object(
        'success', v_success
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_barber(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_barber(UUID) TO service_role;