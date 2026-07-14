
-- ============ Helpers ============
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_barbershop()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
  SELECT barbershop_id FROM public.users WHERE id = auth.uid()
$$;

-- ============ users: RLS ============
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"             ON public.users;
DROP POLICY IF EXISTS "Owners can update any profile"            ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile"             ON public.users;

CREATE POLICY "users_select_scoped" ON public.users
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_role() = 'superadmin'
  OR (
    public.current_user_role() IN ('owner','barber')
    AND (
      barbershop_id = public.current_user_barbershop()
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.client_id = public.users.id
          AND a.barbershop_id = public.current_user_barbershop()
      )
    )
  )
  OR (
    public.current_user_role() = 'client'
    AND role IN ('owner','barber')
  )
);

CREATE POLICY "users_insert_self_client" ON public.users
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND role = 'client' AND barbershop_id IS NULL);

CREATE POLICY "users_update_self" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Trigger que bloqueia mudança de role/barbershop_id (menos service_role)
CREATE OR REPLACE FUNCTION public.enforce_user_role_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role change not allowed';
  END IF;
  IF NEW.barbershop_id IS DISTINCT FROM OLD.barbershop_id THEN
    RAISE EXCEPTION 'barbershop_id change not allowed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_user_role_immutable ON public.users;
CREATE TRIGGER trg_enforce_user_role_immutable
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_role_immutable();

-- ============ barbers: RLS de escrita escopada ============
DROP POLICY IF EXISTS "Owners or the barber themselves can insert" ON public.barbers;
DROP POLICY IF EXISTS "Owners or the barber themselves can update" ON public.barbers;
DROP POLICY IF EXISTS "Owners can delete barbers"                  ON public.barbers;

CREATE POLICY "barbers_insert_same_shop" ON public.barbers
FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
  OR (auth.uid() = user_id AND barbershop_id = public.current_user_barbershop())
);

CREATE POLICY "barbers_update_same_shop" ON public.barbers
FOR UPDATE TO authenticated
USING (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
  OR auth.uid() = user_id
)
WITH CHECK (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
  OR (auth.uid() = user_id AND barbershop_id = public.current_user_barbershop())
);

CREATE POLICY "barbers_delete_same_shop" ON public.barbers
FOR DELETE TO authenticated
USING (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
);

-- ============ services: RLS de escrita escopada ============
DROP POLICY IF EXISTS "Owners can insert services" ON public.services;
DROP POLICY IF EXISTS "Owners can update services" ON public.services;
DROP POLICY IF EXISTS "Owners can delete services" ON public.services;

CREATE POLICY "services_write_same_shop" ON public.services
FOR ALL TO authenticated
USING (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
)
WITH CHECK (
  public.current_user_role() = 'superadmin'
  OR (public.current_user_role() = 'owner' AND barbershop_id = public.current_user_barbershop())
);

-- ============ appointments: leitura para staff ============
DROP POLICY IF EXISTS "appointments_select_staff" ON public.appointments;
CREATE POLICY "appointments_select_staff" ON public.appointments
FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'superadmin'
  OR (
    public.current_user_role() IN ('owner','barber')
    AND barbershop_id = public.current_user_barbershop()
  )
);

-- ============ storage.objects (avatars) ============
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "avatars_insert_own_prefix" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '-%'
    OR public.current_user_role() IN ('owner','superadmin')
  )
);

CREATE POLICY "avatars_update_own_prefix" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '-%'
    OR public.current_user_role() IN ('owner','superadmin')
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '-%'
    OR public.current_user_role() IN ('owner','superadmin')
  )
);

CREATE POLICY "avatars_delete_own_prefix" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '-%'
    OR public.current_user_role() IN ('owner','superadmin')
  )
);

-- ============ search_path em SECURITY DEFINER (sem revogar EXECUTE) ============
ALTER FUNCTION public.barbershop_is_payment_blocked(uuid)                                             SET search_path = public, auth;
ALTER FUNCTION public.create_barbershop_with_owner(text,text,text,text,text,text,text)                 SET search_path = public, auth;
ALTER FUNCTION public.delete_barber(uuid)                                                              SET search_path = public, auth;
ALTER FUNCTION public.create_barber(text,text,text,text,text,numeric,text,uuid)                        SET search_path = public, auth;
ALTER FUNCTION public.create_barber(text,text,text,text,numeric,text,uuid)                             SET search_path = public, auth;
ALTER FUNCTION public.get_superadmin_barbershops()                                                     SET search_path = public, auth;
