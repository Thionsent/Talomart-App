-- Talomart uses Better Auth and server-side PostgreSQL, not Supabase Auth.
-- No browser/Data API role needs direct access, including to catalog tables:
-- the server filters drafts, schedules, review moderation and guest ownership.
-- RLS with NO permissive policies is intentional default-deny. Do not add
-- auth.uid() ownership policies: Better Auth IDs/sessions are not Supabase JWTs.
-- Owners/BYPASSRLS (the existing postgres runtime) retain server access.
-- Keep the audit/history append-only triggers; RLS does not replace them.
DO $$
DECLARE
  table_name text;
  role_name text;
  column_names text;
  protected_tables constant text[] := ARRAY[
    -- Credentials, identity and authorization: never client-readable.
    'user', 'account', 'session', 'verification', 'two_factors',
    'staff_permissions', 'auth_rate_limits', 'endpoint_rate_limits',
    'order_lookup_rate_limits',
    -- Customer/guest ownership and payment state are enforced on the server.
    'addresses', 'carts', 'cart_items', 'wishlists', 'wishlist_items',
    'checkout_sessions', 'orders', 'order_items', 'payments', 'fulfillments',
    -- Internal operations and immutable event history.
    'inventory_movements', 'notification_events', 'email_webhook_events',
    'admin_audit_logs', 'order_status_history',
    -- Public presentation is a filtered server projection, not raw table access.
    'categories', 'products', 'product_images', 'reviews',
    'homepage_sections', 'homepage_banners'
  ];
BEGIN
  -- Do not silently destroy an independently added, unreviewed live policy.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(protected_tables)
  ) THEN
    RAISE EXCEPTION 'Review existing public policies before applying 0016';
  END IF;

  FOREACH table_name IN ARRAY protected_tables LOOP
    -- Missing tables fail the migration rather than silently skipping protection.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
      INTO column_names FROM pg_attribute
      WHERE attrelid = format('public.%I', table_name)::regclass
        AND attnum > 0 AND NOT attisdropped;
    -- Table revocation alone does not remove separately granted column rights.
    EXECUTE format(
      'REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM PUBLIC',
      column_names, column_names, column_names, column_names, table_name);
    FOR role_name IN SELECT rolname FROM pg_roles
      WHERE rolname IN ('anon', 'authenticated')
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, role_name);
      EXECUTE format(
        'REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM %I',
        column_names, column_names, column_names, column_names, table_name, role_name);
    END LOOP;
  END LOOP;
END;
$$;
