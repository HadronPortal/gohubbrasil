CREATE TABLE public.dental_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  phone_secondary TEXT,
  patient_number TEXT,
  record_number TEXT,
  profession TEXT,
  social_network TEXT,
  plan_name TEXT DEFAULT 'Particular',
  insurance_card_number TEXT,
  insurance_holder TEXT,
  insurance_responsible_cpf TEXT,
  zip_code TEXT,
  street TEXT,
  address_number TEXT,
  address_complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dental_patients TO authenticated;
GRANT ALL ON public.dental_patients TO service_role;

ALTER TABLE public.dental_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their dental patients"
ON public.dental_patients
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_dental_patients_updated_at
BEFORE UPDATE ON public.dental_patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();