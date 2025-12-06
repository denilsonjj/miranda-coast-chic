-- ============================================================================
-- SETUP COMPLETO DO BANCO DE DADOS - MIRANDA COSTA CHIC
-- Execute este script no SQL Editor do Supabase Console
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES E TIPOS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============================================================================
-- 2. TABELAS (PRIMEIRO)
-- ============================================================================

-- User Roles
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Profiles
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Addresses
DROP TABLE IF EXISTS public.addresses CASCADE;
CREATE TABLE public.addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products
DROP TABLE IF EXISTS public.products CASCADE;
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cart Items
DROP TABLE IF EXISTS public.cart_items CASCADE;
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, size, color)
);

-- Orders
DROP TABLE IF EXISTS public.orders CASCADE;
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  shipping_service JSONB,
  tracking_code TEXT,
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  mercado_pago_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order Items
DROP TABLE IF EXISTS public.order_items CASCADE;
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  size TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Announcements
DROP TABLE IF EXISTS public.announcements CASCADE;
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. FUNÇÕES (DEPOIS QUE AS TABELAS EXISTEM)
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- User Roles Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Addresses Policies
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- Products Policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Cart Policies
DROP POLICY IF EXISTS "Users can view their own cart" ON public.cart_items;
CREATE POLICY "Users can view their own cart" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their own cart" ON public.cart_items;
CREATE POLICY "Users can add to their own cart" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON public.cart_items;
CREATE POLICY "Users can update their own cart" ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their own cart" ON public.cart_items;
CREATE POLICY "Users can remove from their own cart" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- Orders Policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Order Items Policies
DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.order_items;
CREATE POLICY "Users can view order items of their orders" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
CREATE POLICY "Users can create order items for their orders" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Announcements Policies
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;
CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products CASCADE;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements CASCADE;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders CASCADE;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses CASCADE;
CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items CASCADE;
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. INDEXES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- 8. SETUP COMPLETO!
-- ============================================================================

-- Próximos passos:
-- 1. ✅ Executar este script (você está aqui!)
-- 2. Crie um usuário de teste no Authentication (Supabase Console)
-- 3. Copie o user_id e execute:
--    INSERT INTO public.user_roles (user_id, role) VALUES ('SEU_USER_ID_AQUI', 'admin');
-- 4. Crie 2 buckets no Storage (deixe públicos):
--    - products
--    - announcements
-- 5. Pronto! Seu banco está configurado! 🚀
