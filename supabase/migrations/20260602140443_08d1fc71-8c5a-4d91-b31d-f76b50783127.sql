CREATE OR REPLACE FUNCTION public.delete_barbershop_safe(p_barbershop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if user is superadmin
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Delete in order of dependencies if necessary, but typically standard CASCADE works if defined.
    -- Here we explicitly handle potential blockers or cleanup if needed.
    
    DELETE FROM public.barbershops WHERE id = p_barbershop_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;