CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.dental_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.dental_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  address text,
  logo_url text,
  subscription_status text NOT NULL DEFAULT 'trial',
  monthly_price numeric(12,2) NOT NULL DEFAULT 0,
  paid_until date,
  blocked boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_clinics_subscription_status_check
    CHECK (subscription_status IN ('trial', 'active', 'overdue', 'blocked', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.dental_clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_clinic_members_role_check
    CHECK (role IN ('owner', 'admin', 'dentist', 'assistant', 'receptionist')),
  CONSTRAINT dental_clinic_members_unique UNIQUE (clinic_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dental_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_user_roles_role_check CHECK (role IN ('user', 'superadmin'))
);

CREATE OR REPLACE FUNCTION public.is_dental_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dental_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role = 'superadmin'
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND (
        u.raw_user_meta_data->>'role' = 'superadmin'
        OR u.raw_app_meta_data->>'role' = 'superadmin'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dental_clinic_member(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dental_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.dental_clinic_members m
      WHERE m.clinic_id = p_clinic_id
        AND m.user_id = auth.uid()
        AND m.active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_dental_clinic_admin(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dental_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.dental_clinic_members m
      WHERE m.clinic_id = p_clinic_id
        AND m.user_id = auth.uid()
        AND m.active = true
        AND m.role IN ('owner', 'admin')
    );
$$;

CREATE TABLE IF NOT EXISTS public.dental_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  cro text,
  specialty text,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#2196f3',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dental_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  record_number text,
  sex text,
  foreign_patient boolean NOT NULL DEFAULT false,
  birth_date date,
  cpf text,
  rg text,
  phone_country_code text NOT NULL DEFAULT '+55',
  phone text,
  source text,
  tags text[] NOT NULL DEFAULT '{}',
  responsible_name text,
  responsible_birth_date date,
  responsible_cpf text,
  responsible_phone text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_patients_sex_check CHECK (sex IS NULL OR sex IN ('male', 'female', 'other'))
);

CREATE TABLE IF NOT EXISTS public.dental_patient_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#2196f3',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_patient_tags_unique UNIQUE (clinic_id, name)
);

CREATE TABLE IF NOT EXISTS public.dental_patient_tag_links (
  patient_id uuid NOT NULL REFERENCES public.dental_patients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.dental_patient_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.dental_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_procedures_duration_check CHECK (duration_minutes > 0)
);

CREATE TABLE IF NOT EXISTS public.dental_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.dental_patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.dental_professionals(id) ON DELETE SET NULL,
  procedure_id uuid REFERENCES public.dental_procedures(id) ON DELETE SET NULL,
  title text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  price numeric(12,2),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_appointments_status_check
    CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled')),
  CONSTRAINT dental_appointments_time_check CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.dental_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.dental_patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.dental_professionals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_estimates_status_check
    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.dental_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.dental_estimates(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.dental_procedures(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_estimate_items_quantity_check CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.dental_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.dental_clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.dental_patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.dental_appointments(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES public.dental_estimates(id) ON DELETE SET NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  due_date date,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dental_payments_status_check CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT dental_payments_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_dental_clinic_members_user ON public.dental_clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dental_professionals_clinic ON public.dental_professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dental_patients_clinic_name ON public.dental_patients(clinic_id, full_name);
CREATE INDEX IF NOT EXISTS idx_dental_patients_clinic_phone ON public.dental_patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_clinic_starts ON public.dental_appointments(clinic_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_dental_appointments_professional_starts ON public.dental_appointments(professional_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_dental_payments_clinic_status ON public.dental_payments(clinic_id, status);

DROP TRIGGER IF EXISTS trg_dental_clinics_updated_at ON public.dental_clinics;
CREATE TRIGGER trg_dental_clinics_updated_at
BEFORE UPDATE ON public.dental_clinics
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_clinic_members_updated_at ON public.dental_clinic_members;
CREATE TRIGGER trg_dental_clinic_members_updated_at
BEFORE UPDATE ON public.dental_clinic_members
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_user_roles_updated_at ON public.dental_user_roles;
CREATE TRIGGER trg_dental_user_roles_updated_at
BEFORE UPDATE ON public.dental_user_roles
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_professionals_updated_at ON public.dental_professionals;
CREATE TRIGGER trg_dental_professionals_updated_at
BEFORE UPDATE ON public.dental_professionals
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_patients_updated_at ON public.dental_patients;
CREATE TRIGGER trg_dental_patients_updated_at
BEFORE UPDATE ON public.dental_patients
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_procedures_updated_at ON public.dental_procedures;
CREATE TRIGGER trg_dental_procedures_updated_at
BEFORE UPDATE ON public.dental_procedures
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_appointments_updated_at ON public.dental_appointments;
CREATE TRIGGER trg_dental_appointments_updated_at
BEFORE UPDATE ON public.dental_appointments
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_estimates_updated_at ON public.dental_estimates;
CREATE TRIGGER trg_dental_estimates_updated_at
BEFORE UPDATE ON public.dental_estimates
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

DROP TRIGGER IF EXISTS trg_dental_payments_updated_at ON public.dental_payments;
CREATE TRIGGER trg_dental_payments_updated_at
BEFORE UPDATE ON public.dental_payments
FOR EACH ROW EXECUTE FUNCTION public.dental_set_updated_at();

ALTER TABLE public.dental_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_clinic_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_patient_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_patient_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dental clinics are visible to members" ON public.dental_clinics;
CREATE POLICY "Dental clinics are visible to members"
ON public.dental_clinics FOR SELECT
USING (public.is_dental_clinic_member(id));

DROP POLICY IF EXISTS "Authenticated users can create dental clinics" ON public.dental_clinics;
CREATE POLICY "Authenticated users can create dental clinics"
ON public.dental_clinics FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "Dental admins can update clinics" ON public.dental_clinics;
CREATE POLICY "Dental admins can update clinics"
ON public.dental_clinics FOR UPDATE
USING (public.is_dental_clinic_admin(id))
WITH CHECK (public.is_dental_clinic_admin(id));

DROP POLICY IF EXISTS "Dental admins can delete clinics" ON public.dental_clinics;
CREATE POLICY "Dental admins can delete clinics"
ON public.dental_clinics FOR DELETE
USING (public.is_dental_clinic_admin(id));

DROP POLICY IF EXISTS "Dental members are visible to clinic members" ON public.dental_clinic_members;
CREATE POLICY "Dental members are visible to clinic members"
ON public.dental_clinic_members FOR SELECT
USING (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental admins can insert members" ON public.dental_clinic_members;
CREATE POLICY "Dental admins can insert members"
ON public.dental_clinic_members FOR INSERT
WITH CHECK (public.is_dental_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Dental admins can update members" ON public.dental_clinic_members;
CREATE POLICY "Dental admins can update members"
ON public.dental_clinic_members FOR UPDATE
USING (public.is_dental_clinic_admin(clinic_id))
WITH CHECK (public.is_dental_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Dental admins can delete members" ON public.dental_clinic_members;
CREATE POLICY "Dental admins can delete members"
ON public.dental_clinic_members FOR DELETE
USING (public.is_dental_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Dental members can read professionals" ON public.dental_professionals;
CREATE POLICY "Dental members can read professionals"
ON public.dental_professionals FOR SELECT
USING (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can insert professionals" ON public.dental_professionals;
CREATE POLICY "Dental members can insert professionals"
ON public.dental_professionals FOR INSERT
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can update professionals" ON public.dental_professionals;
CREATE POLICY "Dental members can update professionals"
ON public.dental_professionals FOR UPDATE
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental admins can delete professionals" ON public.dental_professionals;
CREATE POLICY "Dental admins can delete professionals"
ON public.dental_professionals FOR DELETE
USING (public.is_dental_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Dental members can read patients" ON public.dental_patients;
CREATE POLICY "Dental members can read patients"
ON public.dental_patients FOR SELECT
USING (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can insert patients" ON public.dental_patients;
CREATE POLICY "Dental members can insert patients"
ON public.dental_patients FOR INSERT
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can update patients" ON public.dental_patients;
CREATE POLICY "Dental members can update patients"
ON public.dental_patients FOR UPDATE
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental admins can delete patients" ON public.dental_patients;
CREATE POLICY "Dental admins can delete patients"
ON public.dental_patients FOR DELETE
USING (public.is_dental_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Dental members can manage patient tags" ON public.dental_patient_tags;
CREATE POLICY "Dental members can manage patient tags"
ON public.dental_patient_tags FOR ALL
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can manage patient tag links" ON public.dental_patient_tag_links;
CREATE POLICY "Dental members can manage patient tag links"
ON public.dental_patient_tag_links FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.dental_patients p
    WHERE p.id = patient_id
      AND public.is_dental_clinic_member(p.clinic_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dental_patients p
    WHERE p.id = patient_id
      AND public.is_dental_clinic_member(p.clinic_id)
  )
);

DROP POLICY IF EXISTS "Dental members can manage procedures" ON public.dental_procedures;
CREATE POLICY "Dental members can manage procedures"
ON public.dental_procedures FOR ALL
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can manage appointments" ON public.dental_appointments;
CREATE POLICY "Dental members can manage appointments"
ON public.dental_appointments FOR ALL
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can manage estimates" ON public.dental_estimates;
CREATE POLICY "Dental members can manage estimates"
ON public.dental_estimates FOR ALL
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

DROP POLICY IF EXISTS "Dental members can manage estimate items" ON public.dental_estimate_items;
CREATE POLICY "Dental members can manage estimate items"
ON public.dental_estimate_items FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.dental_estimates e
    WHERE e.id = estimate_id
      AND public.is_dental_clinic_member(e.clinic_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dental_estimates e
    WHERE e.id = estimate_id
      AND public.is_dental_clinic_member(e.clinic_id)
  )
);

DROP POLICY IF EXISTS "Dental members can manage payments" ON public.dental_payments;
CREATE POLICY "Dental members can manage payments"
ON public.dental_payments FOR ALL
USING (public.is_dental_clinic_member(clinic_id))
WITH CHECK (public.is_dental_clinic_member(clinic_id));

CREATE OR REPLACE FUNCTION public.get_my_dental_clinics()
RETURNS TABLE (
  clinic_id uuid,
  name text,
  logo_url text,
  role text,
  subscription_status text,
  blocked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS clinic_id,
    c.name,
    c.logo_url,
    m.role,
    c.subscription_status,
    c.blocked
  FROM public.dental_clinics c
  JOIN public.dental_clinic_members m ON m.clinic_id = c.id
  WHERE m.user_id = auth.uid()
    AND m.active = true
    AND c.active = true
  ORDER BY c.name ASC;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_my_dental_clinic(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario nao autenticado');
  END IF;

  INSERT INTO public.dental_clinics (name, created_by)
  VALUES (p_name, auth.uid())
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.dental_clinic_members (clinic_id, user_id, role)
  VALUES (v_clinic_id, auth.uid(), 'owner');

  RETURN jsonb_build_object('success', true, 'clinic_id', v_clinic_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dental_patients(
  p_clinic_id uuid,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  record_number text,
  age integer,
  cpf text,
  phone text,
  phone_country_code text,
  tags text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.record_number,
    CASE
      WHEN p.birth_date IS NULL THEN NULL
      ELSE date_part('year', age(current_date, p.birth_date))::integer
    END AS age,
    p.cpf,
    p.phone,
    p.phone_country_code,
    p.tags,
    p.created_at
  FROM public.dental_patients p
  WHERE p.clinic_id = p_clinic_id
    AND public.is_dental_clinic_member(p.clinic_id)
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR unaccent(lower(p.full_name)) LIKE '%' || unaccent(lower(trim(p_search))) || '%'
      OR regexp_replace(COALESCE(p.cpf, ''), '\D', '', 'g') LIKE '%' || regexp_replace(trim(p_search), '\D', '', 'g') || '%'
      OR regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') LIKE '%' || regexp_replace(trim(p_search), '\D', '', 'g') || '%'
    )
  ORDER BY p.full_name ASC;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.dental_clinics,
  public.dental_clinic_members,
  public.dental_professionals,
  public.dental_patients,
  public.dental_patient_tags,
  public.dental_patient_tag_links,
  public.dental_procedures,
  public.dental_appointments,
  public.dental_estimates,
  public.dental_estimate_items,
  public.dental_payments
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_dental_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dental_clinic_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dental_clinic_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_dental_clinics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_my_dental_clinic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dental_patients(uuid, text) TO authenticated;
