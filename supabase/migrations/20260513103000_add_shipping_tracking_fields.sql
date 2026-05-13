ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS melhor_envio_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_status TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url TEXT;

CREATE INDEX IF NOT EXISTS orders_melhor_envio_id_idx
  ON public.orders(melhor_envio_id);

CREATE INDEX IF NOT EXISTS orders_shipping_status_idx
  ON public.orders(shipping_status);
