-- Fix admin update policies for products to include WITH CHECK clause
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also ensure delete policy is correct
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Fix for announcements as well
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
