BEGIN;

ALTER TABLE public.pending_orders
  ADD COLUMN checkout_key uuid,
  ADD COLUMN payment_intent_id text,
  ADD COLUMN fulfilled_at timestamptz;
CREATE UNIQUE INDEX pending_orders_checkout_key_unique ON public.pending_orders(user_id, checkout_key)
  WHERE checkout_key IS NOT NULL;

-- Payment snapshots survive expiry until fulfilment finishes. Clients can only
-- delete drafts; payment recovery data is managed by the service handlers.
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON public.pending_orders;
DROP POLICY IF EXISTS "Users can delete own pending orders" ON public.pending_orders;
CREATE POLICY "Users delete unpaid drafts" ON public.pending_orders FOR DELETE TO authenticated
  USING (checkout_key IS NULL AND payment_intent_id IS NULL
    AND NOT (order_data ? 'checkoutQuote')
    AND (user_id = auth.uid() OR user_email = auth.jwt()->>'email'));

ALTER TABLE public.orders
  ADD COLUMN checkout_processing_at timestamptz,
  ADD COLUMN fulfilment_completed_at timestamptz,
  ADD COLUMN confirmation_sent_at timestamptz,
  ADD COLUMN admin_alert_sent_at timestamptz;

-- Check completed-work uploads when an order transitions to completed, rather
-- than on unrelated updates to historical orders already marked completed.
CREATE OR REPLACE FUNCTION public.record_first_order_delivery() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.first_delivered_at IS NOT NULL THEN
    NEW.first_delivered_at := OLD.first_delivered_at;
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.order_files WHERE order_id = NEW.id AND file_type = 'completed') THEN
      RAISE EXCEPTION 'Upload completed work before marking the order completed';
    END IF;
    NEW.first_delivered_at := now();
  ELSE
    NEW.first_delivered_at := OLD.first_delivered_at;
  END IF;
  RETURN NEW;
END;
$$;

-- Preserve historical notifications and work status. Existing incomplete orders
-- with a retained checkout snapshot remain eligible for recovery.
UPDATE public.orders o SET confirmation_sent_at = o.created_at, admin_alert_sent_at = o.created_at,
  fulfilment_completed_at = CASE WHEN EXISTS (SELECT 1 FROM public.deliverables d WHERE d.order_id = o.id)
    AND EXISTS (SELECT 1 FROM public.order_files f WHERE f.order_id = o.id AND f.file_type = 'assignment')
    THEN o.created_at ELSE NULL END;
UPDATE public.orders SET status = 'pending' WHERE status = 'paid';

-- Older deployed handlers may briefly overlap this migration. Normalize their
-- payment status without allowing a delayed webhook to undo work already started.
CREATE FUNCTION public.normalize_order_payment_status() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IN ('in_progress', 'completed') THEN
      NEW.status := OLD.status;
    ELSE NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER normalize_order_payment_status BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_order_payment_status();

-- The advisory lock serializes both browser and webhook creation for a payment.
-- Order and deliverables commit together, or neither is saved.
CREATE OR REPLACE FUNCTION public.fulfil_paid_order(p_payment_id text, p_order jsonb, p_deliverables jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_owner uuid; v_count integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payment_id, 0));
  SELECT id, user_id INTO v_id, v_owner FROM public.orders WHERE stripe_payment_intent_id = p_payment_id;
  IF FOUND THEN
    IF v_owner <> (p_order->>'user_id')::uuid THEN RAISE EXCEPTION 'Payment account mismatch'; END IF;
  ELSE
    INSERT INTO public.orders(user_id, status, total_amount, pricing_snapshot, academic_level,
      academic_level_raw, country, subject_field, deadline, additional_instructions,
      originality_report, stripe_payment_intent_id, module_name, is_outside_standard_fields)
    VALUES ((p_order->>'user_id')::uuid, 'pending', (p_order->>'total_amount')::numeric,
      p_order->'pricing_snapshot', p_order->>'academic_level', p_order->>'academic_level_raw',
      p_order->>'country', p_order->>'subject_field', (p_order->>'deadline')::timestamptz,
      p_order->>'additional_instructions', (p_order->>'originality_report')::boolean,
      p_payment_id, p_order->>'module_name', (p_order->>'is_outside_standard_fields')::boolean)
    RETURNING id INTO v_id;
  END IF;
  SELECT count(*) INTO v_count FROM public.deliverables WHERE order_id = v_id;
  IF v_count = 0 THEN
    INSERT INTO public.deliverables(order_id, type, subtype, size_band, price, price_pence,
      extracted_by_ai, ai_description, raw_quantity, quantity_type)
    SELECT v_id, d.type, d.subtype, d.size_band, d.price, d.price_pence,
      d.extracted_by_ai, d.ai_description, d.raw_quantity, d.quantity_type
    FROM pg_catalog.jsonb_to_recordset(p_deliverables) AS d(type text, subtype text, size_band text,
      price numeric, price_pence integer, extracted_by_ai boolean, ai_description text,
      raw_quantity integer, quantity_type text);
  ELSIF v_count <> pg_catalog.jsonb_array_length(p_deliverables) THEN
    RAISE EXCEPTION 'Order deliverables need reconciliation';
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfil_paid_order(text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfil_paid_order(text, jsonb, jsonb) TO service_role;

COMMIT;
