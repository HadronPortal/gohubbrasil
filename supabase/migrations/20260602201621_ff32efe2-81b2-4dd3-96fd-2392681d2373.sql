-- Add payment columns to barbershops
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Update existing records to have a default status if needed
UPDATE public.barbershops SET payment_status = 'pending' WHERE payment_status IS NULL;

-- Ensure payment_status is one of the allowed values via constraint if desired, 
-- but let's keep it flexible for now as per instructions.
