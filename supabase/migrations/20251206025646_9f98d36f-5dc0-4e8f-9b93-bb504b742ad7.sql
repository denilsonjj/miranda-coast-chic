-- Create storage bucket for admin uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Policy: Admins can upload images
CREATE POLICY "Admins can upload images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update images
CREATE POLICY "Admins can update images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can delete images
CREATE POLICY "Admins can delete images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'images' AND public.has_role(auth.uid(), 'admin'));