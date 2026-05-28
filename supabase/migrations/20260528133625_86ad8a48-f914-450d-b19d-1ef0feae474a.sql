CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_barber(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_bio TEXT,
  p_commission_pct NUMERIC,
  p_avatar_url TEXT,
  p_barbershop_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_new_barber_id UUID;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este e-mail já está cadastrado.'
    );
  END IF;

  -- 1. Create Auth User
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 2. Create Identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  -- 3. Create Profile
  INSERT INTO public.profiles (
    id,
    full_name,
    whatsapp,
    avatar_url,
    role,
    barbershop_id
  )
  VALUES (
    v_user_id,
    p_name,
    p_phone,
    p_avatar_url,
    'barber',
    p_barbershop_id
  );

  -- 4. Create Barber
  INSERT INTO public.barbers (
    user_id,
    barbershop_id,
    name,
    bio,
    active,
    commission_pct,
    photo_url
  )
  VALUES (
    v_user_id,
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
    'user_id', v_user_id,
    'barber_id', v_new_barber_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_barber(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barber(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, UUID) TO service_role;