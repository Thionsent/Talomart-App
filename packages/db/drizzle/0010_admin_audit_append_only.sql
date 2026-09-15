CREATE OR REPLACE FUNCTION prevent_admin_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is append-only';
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS admin_audit_logs_append_only ON admin_audit_logs;--> statement-breakpoint
CREATE TRIGGER admin_audit_logs_append_only
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_mutation();
