
CREATE OR REPLACE FUNCTION public.get_my_onboarding_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone text;
  v_accepted boolean;
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT phone, COALESCE(whatsapp_policy_accepted, false), true
    INTO v_phone, v_accepted, v_exists
  FROM public.users WHERE id = v_uid;
  IF NOT COALESCE(v_exists, false) THEN
    v_phone := NULL;
    v_accepted := false;
  END IF;
  RETURN jsonb_build_object(
    'phone', COALESCE(v_phone, ''),
    'whatsapp_policy_accepted', COALESCE(v_accepted, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_onboarding_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(
  p_phone text DEFAULT NULL,
  p_accept_whatsapp_policy boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_digits text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    INSERT INTO public.users (id, role, name)
    VALUES (v_uid, 'client', COALESCE(v_email, 'Cliente'));
  END IF;

  IF p_phone IS NOT NULL THEN
    v_digits := regexp_replace(p_phone, '\D', '', 'g');
    IF length(v_digits) < 10 THEN
      RAISE EXCEPTION 'invalid phone';
    END IF;
    UPDATE public.users SET phone = v_digits, updated_at = now() WHERE id = v_uid;
  END IF;

  IF p_accept_whatsapp_policy IS TRUE THEN
    UPDATE public.users
      SET whatsapp_policy_accepted = true,
          whatsapp_policy_accepted_at = COALESCE(whatsapp_policy_accepted_at, now()),
          updated_at = now()
      WHERE id = v_uid;
  END IF;

  RETURN public.get_my_onboarding_state();
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(text, boolean) TO authenticated;
