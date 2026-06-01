CREATE OR REPLACE FUNCTION public.create_barber(
  p_email text,
  p_name text,
  p_phone text,
  p_bio text,
  p_commission_pct numeric,
  p_avatar_url text,
  p_barbershop_id uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_new_barber_id UUID;
BEGIN
  -- Security check: only owners or admins (or service role) should be able to do this
  -- Note: If we want to allow anyone to register as a barber, we'd remove this.
  -- But usually, it's the barbershop owner adding them.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'owner' OR role = 'admin')
  ) AND auth.role() <> 'service_role' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Apenas administradores podem cadastrar barbeiros.'
    );
  END IF;

  -- 1. Create Barber entry (without user_id yet, or with a temporary state)
  -- Actually, let's create the barber record. We can update it with user_id later
  -- via a trigger on the profiles table or by passing it in the signUp metadata.
  
  INSERT INTO public.barbers (
    barbershop_id,
    name,
    bio,
    active,
    commission_pct,
    photo_url
  )
  VALUES (
    p_barbershop_id,
    p_name,
    p_bio,
    true,
    p_commission_pct,
    p_avatar_url
  )
  RETURNING id INTO v_new_barber_id;

  RETURN json_build_object(
    'success', true,
    'barber_id', v_new_barber_id,
    'email', p_email
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;