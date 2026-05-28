-- Add active column to barbers
ALTER TABLE public.barbers ADD COLUMN active BOOLEAN DEFAULT true;

-- Add user_id to barbers referencing profiles
ALTER TABLE public.barbers ADD COLUMN user_id UUID REFERENCES public.profiles(id);

-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Update existing barbers to be active (though default handles it)
UPDATE public.barbers SET active = true WHERE active IS NULL;
