ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS whatsapp_policy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_policy_accepted_at timestamptz NULL;