-- Add function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add mercado_pago_payment_id column to orders table if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT;

-- Create trigger for orders table updated_at
CREATE TRIGGER IF NOT EXISTS update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for products table updated_at
CREATE TRIGGER IF NOT EXISTS update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure all necessary indexes exist for performance
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);
