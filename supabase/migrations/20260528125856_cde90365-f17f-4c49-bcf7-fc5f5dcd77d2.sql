-- Drop the broad policy
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Create a more restrictive policy that still allows viewing but is scoped
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');
