CREATE OR REPLACE FUNCTION public.confirm_paid_order_and_decrement_stock(
  _order_id UUID,
  _mercado_pago_payment_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_has_variants BOOLEAN;
  v_variant_id UUID;
  v_variant_stock INTEGER;
  v_product_stock INTEGER;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    UPDATE public.orders
    SET
      mercado_pago_payment_id = COALESCE(_mercado_pago_payment_id, mercado_pago_payment_id),
      updated_at = now()
    WHERE id = _order_id;
    RETURN;
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.order_items
    WHERE order_id = _order_id
    ORDER BY product_id, size, color
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.product_variants
      WHERE product_id = v_item.product_id
    )
    INTO v_has_variants;

    IF v_has_variants THEN
      SELECT id, stock
      INTO v_variant_id, v_variant_stock
      FROM public.product_variants
      WHERE product_id = v_item.product_id
        AND size IS NOT DISTINCT FROM v_item.size
        AND color IS NOT DISTINCT FROM v_item.color
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'variant_not_found:%', v_item.product_name;
      END IF;

      IF v_variant_stock < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_item.product_name;
      END IF;

      UPDATE public.product_variants
      SET stock = stock - v_item.quantity, updated_at = now()
      WHERE id = v_variant_id;

      UPDATE public.products
      SET
        stock = (
          SELECT COALESCE(SUM(stock), 0)
          FROM public.product_variants
          WHERE product_id = v_item.product_id
        ),
        updated_at = now()
      WHERE id = v_item.product_id;
    ELSE
      SELECT stock
      INTO v_product_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'product_not_found:%', v_item.product_name;
      END IF;

      IF v_product_stock < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_item.product_name;
      END IF;

      UPDATE public.products
      SET stock = stock - v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET
    payment_status = 'paid',
    status = 'confirmed',
    mercado_pago_payment_id = COALESCE(_mercado_pago_payment_id, mercado_pago_payment_id),
    updated_at = now()
  WHERE id = _order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_paid_order_and_decrement_stock(UUID, TEXT) TO service_role;
