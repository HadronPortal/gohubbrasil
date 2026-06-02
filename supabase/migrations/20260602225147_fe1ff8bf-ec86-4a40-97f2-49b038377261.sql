-- Create unique index to prevent duplicate barber entries for the same user in a barbershop
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_barbers_user_barbershop') THEN
        CREATE UNIQUE INDEX idx_barbers_user_barbershop ON public.barbers (user_id, barbershop_id);
    END IF;
END $$;

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.ensure_owner_is_barber(
  p_owner_user_id UUID,
  p_barbershop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_user_avatar TEXT;
BEGIN
  -- Get user info from public.users
  SELECT name, avatar_url INTO v_user_name, v_user_avatar
  FROM public.users
  WHERE id = p_owner_user_id;

  -- Upsert into barbers
  INSERT INTO public.barbers (
    user_id,
    barbershop_id,
    name,
    photo_url,
    bio,
    active,
    commission_pct
  )
  VALUES (
    p_owner_user_id,
    p_barbershop_id,
    COALESCE(v_user_name, 'Proprietário'),
    v_user_avatar,
    'Proprietário',
    TRUE,
    0
  )
  ON CONFLICT (user_id, barbershop_id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    photo_url = EXCLUDED.photo_url,
    active = TRUE;

  RETURN jsonb_build_object('success', TRUE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.ensure_owner_is_barber(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_owner_is_barber(UUID, UUID) TO authenticated;
