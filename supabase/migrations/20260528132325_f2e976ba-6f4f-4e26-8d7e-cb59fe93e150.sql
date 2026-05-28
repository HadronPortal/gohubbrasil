-- Add missing policies for barbers table
CREATE POLICY "Owners can insert barbers" 
ON public.barbers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can update barbers" 
ON public.barbers FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete barbers" 
ON public.barbers FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

-- Add missing policies for services table
CREATE POLICY "Owners can insert services" 
ON public.services FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can update services" 
ON public.services FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete services" 
ON public.services FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  )
);

-- Grant permissions (just in case)
GRANT ALL ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
