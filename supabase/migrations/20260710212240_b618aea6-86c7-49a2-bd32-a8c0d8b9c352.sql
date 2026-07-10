
-- =========================================================
-- 1) SCHEDULE SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.barbershop_schedule_settings (
  barbershop_id uuid PRIMARY KEY REFERENCES public.barbershops(id) ON DELETE CASCADE,
  mon_open time NOT NULL DEFAULT '09:00',
  mon_close time NOT NULL DEFAULT '18:00',
  tue_open time NOT NULL DEFAULT '09:00',
  tue_close time NOT NULL DEFAULT '18:00',
  wed_open time NOT NULL DEFAULT '09:00',
  wed_close time NOT NULL DEFAULT '18:00',
  thu_open time NOT NULL DEFAULT '09:00',
  thu_close time NOT NULL DEFAULT '18:00',
  fri_open time NOT NULL DEFAULT '09:00',
  fri_close time NOT NULL DEFAULT '18:00',
  sat_open time NOT NULL DEFAULT '09:00',
  sat_close time NOT NULL DEFAULT '13:00',
  sun_enabled boolean NOT NULL DEFAULT false,
  sun_open time NOT NULL DEFAULT '09:00',
  sun_close time NOT NULL DEFAULT '13:00',
  slot_interval_minutes int NOT NULL DEFAULT 30 CHECK (slot_interval_minutes IN (15,30,45,60)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.barbershop_schedule_settings TO anon, authenticated;
GRANT ALL ON public.barbershop_schedule_settings TO service_role;
ALTER TABLE public.barbershop_schedule_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedule settings readable by everyone" ON public.barbershop_schedule_settings;
CREATE POLICY "Schedule settings readable by everyone"
ON public.barbershop_schedule_settings FOR SELECT
USING (true);

DROP TRIGGER IF EXISTS trg_schedule_settings_updated_at ON public.barbershop_schedule_settings;
CREATE TRIGGER trg_schedule_settings_updated_at
BEFORE UPDATE ON public.barbershop_schedule_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) TIME BLOCKS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.barbershop_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  repeat_daily boolean NOT NULL DEFAULT true,
  only_open_days boolean NOT NULL DEFAULT true,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_bs_dates
  ON public.barbershop_time_blocks (barbershop_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_blocks_barber
  ON public.barbershop_time_blocks (barber_id);

GRANT SELECT ON public.barbershop_time_blocks TO anon, authenticated;
GRANT ALL ON public.barbershop_time_blocks TO service_role;
ALTER TABLE public.barbershop_time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Time blocks readable by everyone" ON public.barbershop_time_blocks;
CREATE POLICY "Time blocks readable by everyone"
ON public.barbershop_time_blocks FOR SELECT
USING (true);

DROP TRIGGER IF EXISTS trg_time_blocks_updated_at ON public.barbershop_time_blocks;
CREATE TRIGGER trg_time_blocks_updated_at
BEFORE UPDATE ON public.barbershop_time_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3) HELPERS
-- =========================================================
CREATE OR REPLACE FUNCTION public._resolve_my_barbershop(p_barbershop_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bs uuid;
BEGIN
  IF p_barbershop_id IS NOT NULL THEN
    RETURN p_barbershop_id;
  END IF;
  SELECT barbershop_id INTO v_bs FROM public.users WHERE id = auth.uid();
  IF v_bs IS NULL THEN
    SELECT barbershop_id INTO v_bs FROM public.barbers WHERE user_id = auth.uid() LIMIT 1;
  END IF;
  RETURN v_bs;
END;
$$;

CREATE OR REPLACE FUNCTION public._can_manage_schedule(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'superadmin' OR (u.role = 'owner' AND u.barbershop_id = p_barbershop_id))
  );
$$;

CREATE OR REPLACE FUNCTION public._can_manage_block(p_barbershop_id uuid, p_barber_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public._can_manage_schedule(p_barbershop_id)
    OR (
      p_barber_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.barbers b
        WHERE b.id = p_barber_id
          AND b.user_id = auth.uid()
          AND b.barbershop_id = p_barbershop_id
      )
    );
$$;

-- day of week (0=sun..6=sat) -> open/close/enabled
CREATE OR REPLACE FUNCTION public._day_window(p_barbershop_id uuid, p_day date)
RETURNS TABLE(open_time time, close_time time, enabled boolean, slot_interval_minutes int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.barbershop_schedule_settings%ROWTYPE;
  dow int := EXTRACT(DOW FROM p_day)::int; -- 0 sun .. 6 sat
BEGIN
  SELECT * INTO s FROM public.barbershop_schedule_settings WHERE barbershop_id = p_barbershop_id;
  IF NOT FOUND THEN
    -- default: Mon-Fri 9-18, Sat 9-13, Sun closed
    IF dow = 0 THEN
      open_time := '09:00'; close_time := '13:00'; enabled := false;
    ELSIF dow = 6 THEN
      open_time := '09:00'; close_time := '13:00'; enabled := true;
    ELSE
      open_time := '09:00'; close_time := '18:00'; enabled := true;
    END IF;
    slot_interval_minutes := 30;
    RETURN NEXT; RETURN;
  END IF;

  slot_interval_minutes := s.slot_interval_minutes;
  CASE dow
    WHEN 0 THEN open_time := s.sun_open; close_time := s.sun_close; enabled := s.sun_enabled;
    WHEN 1 THEN open_time := s.mon_open; close_time := s.mon_close; enabled := true;
    WHEN 2 THEN open_time := s.tue_open; close_time := s.tue_close; enabled := true;
    WHEN 3 THEN open_time := s.wed_open; close_time := s.wed_close; enabled := true;
    WHEN 4 THEN open_time := s.thu_open; close_time := s.thu_close; enabled := true;
    WHEN 5 THEN open_time := s.fri_open; close_time := s.fri_close; enabled := true;
    WHEN 6 THEN open_time := s.sat_open; close_time := s.sat_close; enabled := true;
  END CASE;
  RETURN NEXT;
END;
$$;

-- =========================================================
-- 4) UPDATE SCHEDULE SETTINGS (upsert)
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_barbershop_schedule_settings(
  p_barbershop_id uuid DEFAULT NULL,
  p_opening_time time DEFAULT NULL,      -- legacy simple (aplica seg-sex)
  p_closing_time time DEFAULT NULL,      -- legacy simple
  p_slot_interval_minutes int DEFAULT 30,
  p_mon_open time DEFAULT NULL, p_mon_close time DEFAULT NULL,
  p_tue_open time DEFAULT NULL, p_tue_close time DEFAULT NULL,
  p_wed_open time DEFAULT NULL, p_wed_close time DEFAULT NULL,
  p_thu_open time DEFAULT NULL, p_thu_close time DEFAULT NULL,
  p_fri_open time DEFAULT NULL, p_fri_close time DEFAULT NULL,
  p_sat_open time DEFAULT NULL, p_sat_close time DEFAULT NULL,
  p_sun_enabled boolean DEFAULT NULL,
  p_sun_open time DEFAULT NULL, p_sun_close time DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bs uuid;
  v_mon_o time; v_mon_c time;
  v_tue_o time; v_tue_c time;
  v_wed_o time; v_wed_c time;
  v_thu_o time; v_thu_c time;
  v_fri_o time; v_fri_c time;
  v_sat_o time; v_sat_c time;
  v_sun_e boolean; v_sun_o time; v_sun_c time;
BEGIN
  v_bs := public._resolve_my_barbershop(p_barbershop_id);
  IF v_bs IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estabelecimento não identificado');
  END IF;
  IF NOT public._can_manage_schedule(v_bs) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- Legacy fallback: se opening/closing informados, aplicam a seg-sex quando os específicos vierem null
  v_mon_o := COALESCE(p_mon_open, p_opening_time, '09:00'::time);
  v_mon_c := COALESCE(p_mon_close, p_closing_time, '18:00'::time);
  v_tue_o := COALESCE(p_tue_open, p_opening_time, v_mon_o);
  v_tue_c := COALESCE(p_tue_close, p_closing_time, v_mon_c);
  v_wed_o := COALESCE(p_wed_open, p_opening_time, v_mon_o);
  v_wed_c := COALESCE(p_wed_close, p_closing_time, v_mon_c);
  v_thu_o := COALESCE(p_thu_open, p_opening_time, v_mon_o);
  v_thu_c := COALESCE(p_thu_close, p_closing_time, v_mon_c);
  v_fri_o := COALESCE(p_fri_open, p_opening_time, v_mon_o);
  v_fri_c := COALESCE(p_fri_close, p_closing_time, v_mon_c);
  v_sat_o := COALESCE(p_sat_open, '09:00'::time);
  v_sat_c := COALESCE(p_sat_close, '13:00'::time);
  v_sun_e := COALESCE(p_sun_enabled, false);
  v_sun_o := COALESCE(p_sun_open, '09:00'::time);
  v_sun_c := COALESCE(p_sun_close, '13:00'::time);

  INSERT INTO public.barbershop_schedule_settings AS s (
    barbershop_id, mon_open, mon_close, tue_open, tue_close, wed_open, wed_close,
    thu_open, thu_close, fri_open, fri_close, sat_open, sat_close,
    sun_enabled, sun_open, sun_close, slot_interval_minutes
  ) VALUES (
    v_bs, v_mon_o, v_mon_c, v_tue_o, v_tue_c, v_wed_o, v_wed_c,
    v_thu_o, v_thu_c, v_fri_o, v_fri_c, v_sat_o, v_sat_c,
    v_sun_e, v_sun_o, v_sun_c, COALESCE(p_slot_interval_minutes, 30)
  )
  ON CONFLICT (barbershop_id) DO UPDATE SET
    mon_open = EXCLUDED.mon_open, mon_close = EXCLUDED.mon_close,
    tue_open = EXCLUDED.tue_open, tue_close = EXCLUDED.tue_close,
    wed_open = EXCLUDED.wed_open, wed_close = EXCLUDED.wed_close,
    thu_open = EXCLUDED.thu_open, thu_close = EXCLUDED.thu_close,
    fri_open = EXCLUDED.fri_open, fri_close = EXCLUDED.fri_close,
    sat_open = EXCLUDED.sat_open, sat_close = EXCLUDED.sat_close,
    sun_enabled = EXCLUDED.sun_enabled,
    sun_open = EXCLUDED.sun_open, sun_close = EXCLUDED.sun_close,
    slot_interval_minutes = EXCLUDED.slot_interval_minutes;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_barbershop_schedule_settings(p_barbershop_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.barbershop_schedule_settings%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.barbershop_schedule_settings WHERE barbershop_id = p_barbershop_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'barbershop_id', p_barbershop_id,
      'mon_open','09:00','mon_close','18:00',
      'tue_open','09:00','tue_close','18:00',
      'wed_open','09:00','wed_close','18:00',
      'thu_open','09:00','thu_close','18:00',
      'fri_open','09:00','fri_close','18:00',
      'sat_open','09:00','sat_close','13:00',
      'sun_enabled', false,
      'sun_open','09:00','sun_close','13:00',
      'slot_interval_minutes', 30
    );
  END IF;
  RETURN to_jsonb(r);
END; $$;

-- =========================================================
-- 5) CREATE TIME BLOCK
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_barbershop_time_block(
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_barbershop_id uuid DEFAULT NULL,
  p_barber_id uuid DEFAULT NULL,
  p_repeat_daily boolean DEFAULT true,
  p_only_open_days boolean DEFAULT true,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bs uuid;
  v_id uuid;
BEGIN
  v_bs := public._resolve_my_barbershop(p_barbershop_id);
  IF v_bs IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estabelecimento não identificado');
  END IF;
  IF NOT public._can_manage_block(v_bs, p_barber_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  IF p_end_date < p_start_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Data final antes da inicial');
  END IF;
  IF p_end_time <= p_start_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'Horário final deve ser após o inicial');
  END IF;

  INSERT INTO public.barbershop_time_blocks (
    barbershop_id, barber_id, start_date, end_date, start_time, end_time,
    repeat_daily, only_open_days, reason, created_by
  ) VALUES (
    v_bs, p_barber_id, p_start_date, p_end_date, p_start_time, p_end_time,
    COALESCE(p_repeat_daily, true), COALESCE(p_only_open_days, true), p_reason, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Alias legado usado pelo frontend antigo (single-day)
CREATE OR REPLACE FUNCTION public.create_barbershop_time_block_local(
  p_day date,
  p_start_time time,
  p_end_time time,
  p_reason text DEFAULT NULL,
  p_barber_id uuid DEFAULT NULL,
  p_barbershop_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.create_barbershop_time_block(
    p_day, p_day, p_start_time, p_end_time,
    p_barbershop_id, p_barber_id, true, false, p_reason
  );
END; $$;

-- =========================================================
-- 6) DELETE TIME BLOCK
-- =========================================================
CREATE OR REPLACE FUNCTION public.delete_barbershop_time_block(p_block_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bs uuid; v_barber uuid;
BEGIN
  SELECT barbershop_id, barber_id INTO v_bs, v_barber
  FROM public.barbershop_time_blocks WHERE id = p_block_id;
  IF v_bs IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bloqueio não encontrado');
  END IF;
  IF NOT public._can_manage_block(v_bs, v_barber) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  DELETE FROM public.barbershop_time_blocks WHERE id = p_block_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- =========================================================
-- 7) AVAILABLE SLOTS
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_barbershop_available_slots(
  p_day date,
  p_barber_id uuid DEFAULT NULL,
  p_barbershop_id uuid DEFAULT NULL,
  p_duration_minutes int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bs uuid;
  v_win record;
  v_interval int;
  v_duration int;
  v_slots jsonb := '[]'::jsonb;
  v_barbers jsonb;
  v_blocks jsonb;
  v_barber record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_tz text := 'America/Sao_Paulo';
BEGIN
  v_bs := public._resolve_my_barbershop(p_barbershop_id);
  IF v_bs IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Estabelecimento não identificado');
  END IF;

  SELECT * INTO v_win FROM public._day_window(v_bs, p_day);
  v_interval := COALESCE(v_win.slot_interval_minutes, 30);
  v_duration := COALESCE(p_duration_minutes, v_interval);

  -- barbers list
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'barber_id', b.id, 'name', b.name, 'avatar_url', b.photo_url
  ) ORDER BY b.name), '[]'::jsonb) INTO v_barbers
  FROM public.barbers b
  WHERE b.barbershop_id = v_bs AND COALESCE(b.active, true) = true;

  -- blocks of the day (applied to this specific date)
  WITH candidate AS (
    SELECT tb.*
    FROM public.barbershop_time_blocks tb
    WHERE tb.barbershop_id = v_bs
      AND p_day BETWEEN tb.start_date AND tb.end_date
      AND (p_barber_id IS NULL OR tb.barber_id IS NULL OR tb.barber_id = p_barber_id)
      AND (
        NOT tb.only_open_days
        OR (SELECT enabled FROM public._day_window(v_bs, p_day))
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'barber_id', c.barber_id,
    'starts_at', ((p_day::text || ' ' || c.start_time::text)::timestamp AT TIME ZONE v_tz),
    'ends_at',   ((p_day::text || ' ' || c.end_time::text)::timestamp AT TIME ZONE v_tz),
    'reason', c.reason
  )), '[]'::jsonb) INTO v_blocks FROM candidate c;

  IF NOT v_win.enabled THEN
    RETURN jsonb_build_object(
      'success', true,
      'settings', jsonb_build_object(
        'opening_time', v_win.open_time,
        'closing_time', v_win.close_time,
        'slot_interval_minutes', v_interval,
        'enabled', false
      ),
      'barbers', v_barbers,
      'blocks', v_blocks,
      'slots', '[]'::jsonb
    );
  END IF;

  v_day_start := (p_day::text || ' ' || v_win.open_time::text)::timestamp AT TIME ZONE v_tz;
  v_day_end   := (p_day::text || ' ' || v_win.close_time::text)::timestamp AT TIME ZONE v_tz;

  -- iterate barbers x slots
  FOR v_barber IN
    SELECT b.id AS barber_id, b.name, b.photo_url
    FROM public.barbers b
    WHERE b.barbershop_id = v_bs
      AND COALESCE(b.active, true) = true
      AND (p_barber_id IS NULL OR b.id = p_barber_id)
    ORDER BY b.name
  LOOP
    v_slot_start := v_day_start;
    WHILE v_slot_start + make_interval(mins => v_duration) <= v_day_end LOOP
      v_slot_end := v_slot_start + make_interval(mins => v_duration);

      -- appointment conflict (any non-cancelled appointment)
      IF NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.barbershop_id = v_bs
          AND a.barber_id = v_barber.barber_id
          AND COALESCE(a.status, 'scheduled') NOT IN ('cancelled','canceled','cancelado','no_show')
          AND COALESCE(a.starts_at, a.appointment_time) < v_slot_end
          AND COALESCE(a.ends_at, COALESCE(a.starts_at, a.appointment_time) + make_interval(mins => v_duration)) > v_slot_start
      )
      -- block conflict
      AND NOT EXISTS (
        SELECT 1 FROM public.barbershop_time_blocks tb
        WHERE tb.barbershop_id = v_bs
          AND (tb.barber_id IS NULL OR tb.barber_id = v_barber.barber_id)
          AND p_day BETWEEN tb.start_date AND tb.end_date
          AND (NOT tb.only_open_days OR v_win.enabled)
          AND ((p_day::text || ' ' || tb.start_time::text)::timestamp AT TIME ZONE v_tz) < v_slot_end
          AND ((p_day::text || ' ' || tb.end_time::text)::timestamp AT TIME ZONE v_tz)   > v_slot_start
      )
      THEN
        v_slots := v_slots || jsonb_build_object(
          'barber_id', v_barber.barber_id,
          'barber_name', v_barber.name,
          'barber_avatar_url', v_barber.photo_url,
          'starts_at', v_slot_start,
          'ends_at', v_slot_end,
          'time_label', to_char(v_slot_start AT TIME ZONE v_tz, 'HH24:MI')
        );
      END IF;

      v_slot_start := v_slot_start + make_interval(mins => v_interval);
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'settings', jsonb_build_object(
      'opening_time', v_win.open_time,
      'closing_time', v_win.close_time,
      'slot_interval_minutes', v_interval,
      'enabled', true
    ),
    'barbers', v_barbers,
    'blocks', v_blocks,
    'slots', v_slots
  );
END;
$$;

-- Grants on RPCs
GRANT EXECUTE ON FUNCTION public.update_barbershop_schedule_settings(uuid, time, time, int, time, time, time, time, time, time, time, time, time, time, time, time, boolean, time, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_barbershop_schedule_settings(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_time_block(date, date, time, time, uuid, uuid, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_time_block_local(date, time, time, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_barbershop_time_block(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_barbershop_available_slots(date, uuid, uuid, int) TO anon, authenticated;
