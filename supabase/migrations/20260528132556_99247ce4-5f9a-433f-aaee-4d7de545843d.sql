-- Drop old policies to recreate them more flexibly
DROP POLICY IF EXISTS "Owners can insert barbers" ON public.barbers;
DROP POLICY IF EXISTS "Owners can update barbers" ON public.barbers;
DROP POLICY IF EXISTS "Owners can delete barbers" ON public.barbers;

-- New Barbers policies
CREATE POLICY "Owners or the barber themselves can insert" 
ON public.barbers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  ) OR (auth.uid() = user_id)
);

CREATE POLICY "Owners or the barber themselves can update" 
ON public.barbers FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  ) OR (auth.uid() = user_id)
);

CREATE POLICY "Owners can delete barbers" 
ON public.barbers FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

-- Fix profiles to allow owner to setup the barber profile
-- (Though signUp swaps session, so the barber will be updating their own profile anyway)
-- But just in case:
CREATE POLICY "Owners can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);
