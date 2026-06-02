ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_charged NUMERIC,
ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confirmed_via_whatsapp BOOLEAN DEFAULT FALSE;

-- Migrate existing data if any
UPDATE public.appointments 
SET starts_at = appointment_time 
WHERE starts_at IS NULL AND appointment_time IS NOT NULL;
