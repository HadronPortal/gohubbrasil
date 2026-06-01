CREATE OR REPLACE FUNCTION public.delete_barber(p_barber_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    -- 1. Cancelar agendamentos futuros pendentes
    -- Usando appointment_time que é o nome correto da coluna
    UPDATE public.appointments
    SET status = 'cancelled'
    WHERE barber_id = p_barber_id
      AND appointment_time >= NOW()
      AND status = 'pending';

    -- 2. Deletar o barbeiro
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
$function$;