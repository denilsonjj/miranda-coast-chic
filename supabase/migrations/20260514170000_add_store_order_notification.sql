ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_store_notified_at_idx
  ON public.orders(store_notified_at);
