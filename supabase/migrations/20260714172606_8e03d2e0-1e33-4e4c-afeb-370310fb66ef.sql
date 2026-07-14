CREATE OR REPLACE FUNCTION public.claim_manual_client_account(p_phone text, p_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_digits text;
  v_manual_id uuid;
  v_transferred int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_phone');
  END IF;

  -- Find a manual client (no auth account) with matching phone digits
  SELECT u.id INTO v_manual_id
  FROM public.users u
  LEFT JOIN auth.users au ON au.id = u.id
  WHERE u.role = 'client'
    AND u.id <> v_uid
    AND au.id IS NULL
    AND regexp_replace(coalesce(u.phone,''), '\D', '', 'g') = v_digits
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  -- Ensure the logged-in user has phone/name set
  UPDATE public.users
  SET phone = COALESCE(NULLIF(phone, ''), v_digits),
      name  = COALESCE(NULLIF(name, ''), NULLIF(trim(coalesce(p_name,'')), ''), name)
  WHERE id = v_uid;

  IF v_manual_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'merged', false, 'transferred', 0);
  END IF;

  -- Transfer appointments
  UPDATE public.appointments
  SET client_id = v_uid
  WHERE client_id = v_manual_id;
  GET DIAGNOSTICS v_transferred = ROW_COUNT;

  -- Merge barbershop_clients rows (if table exists)
  BEGIN
    UPDATE public.barbershop_clients bc
    SET client_id = v_uid,
        name = COALESCE(bc.name, (SELECT name FROM public.users WHERE id = v_uid)),
        phone = COALESCE(bc.phone, v_digits),
        updated_at = now()
    WHERE bc.client_id = v_manual_id
      AND NOT EXISTS (
        SELECT 1 FROM public.barbershop_clients bc2
        WHERE bc2.barbershop_id = bc.barbershop_id AND bc2.client_id = v_uid
      );
    DELETE FROM public.barbershop_clients WHERE client_id = v_manual_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Delete the manual placeholder user
  DELETE FROM public.users WHERE id = v_manual_id;

  RETURN jsonb_build_object('success', true, 'merged', true, 'transferred', v_transferred);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_manual_client_account(text, text) TO authenticated;