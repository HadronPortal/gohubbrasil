
CREATE OR REPLACE FUNCTION public.get_barbershop_time_blocks(
  p_barbershop_id uuid,
  p_day date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_barbershop_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.start_date, t.start_time), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT
      b.id,
      b.barbershop_id,
      b.barber_id,
      br.name AS barber_name,
      b.start_date,
      b.end_date,
      b.start_time,
      b.end_time,
      b.repeat_daily,
      b.only_open_days,
      b.reason
    FROM public.barbershop_time_blocks b
    LEFT JOIN public.barbers br ON br.id = b.barber_id
    WHERE b.barbershop_id = p_barbershop_id
      AND (
        p_day IS NULL
        OR (p_day BETWEEN b.start_date AND b.end_date)
      )
  ) t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_barbershop_time_blocks(uuid, date) TO authenticated, anon;
