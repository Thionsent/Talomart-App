import postgres from "postgres";

const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false
});

const expectedTables = [
  "admin_audit_logs",
  "auth_rate_limits",
  "endpoint_rate_limits",
  "order_status_history",
  "staff_permissions",
  "two_factors"
];

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ${sql(expectedTables)}
  `;
  const presentTables = new Set(tables.map((row) => row.table_name));
  const missingTables = expectedTables.filter(
    (table) => !presentTables.has(table)
  );

  const triggers = await sql`
    SELECT relation.relname AS table_name, trigger.tgname AS trigger_name
    FROM pg_trigger AS trigger
    JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND (
        (relation.relname = 'admin_audit_logs'
          AND trigger.tgname = 'admin_audit_logs_append_only')
        OR
        (relation.relname = 'order_status_history'
          AND trigger.tgname = 'order_status_history_append_only')
      )
      AND NOT trigger.tgisinternal
  `;

  let auditAppendOnlyEnforced = false;
  let auditMutationCheckError = "";
  try {
    await sql.begin(async (transaction) => {
      const [event] = await transaction`
        INSERT INTO admin_audit_logs (
          id,
          actor_role,
          action,
          resource_type,
          summary,
          created_at
        ) VALUES (
          ${crypto.randomUUID()},
          'admin',
          'security.self_test',
          'security_schema',
          'Temporary append-only verification event',
          now()
        )
        RETURNING id
      `;

      await transaction`
        UPDATE admin_audit_logs
        SET summary = 'This mutation must be rejected'
        WHERE id = ${event.id}
      `;

      throw new Error("AUDIT_MUTATION_WAS_ALLOWED");
    });
  } catch (error) {
    auditMutationCheckError =
      error instanceof Error ? error.message : String(error);
    auditAppendOnlyEnforced = auditMutationCheckError.includes(
      "admin_audit_logs is append-only"
    );
  }

  let statusHistoryAppendOnlyEnforced = false;
  let statusHistoryMutationCheckError = "";
  try {
    await sql.begin(async (transaction) => {
      const orderNumber = `TLM-SECURITY-${crypto.randomUUID()}`;
      const [order] = await transaction`
        INSERT INTO orders (
          order_number,
          status,
          payment_method,
          subtotal_minor,
          total_minor,
          recipient_name,
          phone,
          county,
          town,
          delivery_address
        ) VALUES (
          ${orderNumber},
          'pending_payment',
          'cash_on_delivery',
          0,
          0,
          'Security self-test',
          '254700000000',
          'Nairobi',
          'Nairobi',
          'Security schema self-test'
        )
        RETURNING id
      `;

      const [history] = await transaction`
        INSERT INTO order_status_history (
          order_id,
          previous_status,
          next_status,
          source,
          reason
        ) VALUES (
          ${order.id},
          null,
          'pending_payment',
          'system',
          'Temporary append-only verification event'
        )
        RETURNING id
      `;

      await transaction`
        UPDATE order_status_history
        SET reason = 'This mutation must be rejected'
        WHERE id = ${history.id}
      `;

      throw new Error("ORDER_STATUS_HISTORY_MUTATION_WAS_ALLOWED");
    });
  } catch (error) {
    statusHistoryMutationCheckError =
      error instanceof Error ? error.message : String(error);
    statusHistoryAppendOnlyEnforced = statusHistoryMutationCheckError.includes(
      "order_status_history is append-only"
    );
  }

  const failures = [];
  if (missingTables.length) {
    failures.push(`missing tables: ${missingTables.join(", ")}`);
  }
  if (
    !triggers.some(
      (trigger) =>
        trigger.table_name === "admin_audit_logs" &&
        trigger.trigger_name === "admin_audit_logs_append_only"
    )
  ) {
    failures.push("append-only audit trigger is missing");
  }
  if (
    !triggers.some(
      (trigger) =>
        trigger.table_name === "order_status_history" &&
        trigger.trigger_name === "order_status_history_append_only"
    )
  ) {
    failures.push("append-only order status history trigger is missing");
  }
  if (!auditAppendOnlyEnforced) {
    failures.push(
      `audit mutations were not rejected (${auditMutationCheckError || "no database error"})`
    );
  }
  if (!statusHistoryAppendOnlyEnforced) {
    failures.push(
      `order status history mutations were not rejected (${statusHistoryMutationCheckError || "no database error"})`
    );
  }

  if (failures.length) {
    console.error(`Security schema check failed: ${failures.join("; ")}.`);
    process.exitCode = 1;
  } else {
    console.log(
      "Security schema check passed: MFA, rate-limit, permission, audit and order-history tables exist; audit and order status events are append-only."
    );
  }
} finally {
  await sql.end({ timeout: 5 });
}
