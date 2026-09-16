import { Kysely, sql } from "kysely";

// One row per (monitor_id, time_bucket) minute bucket, upserted by the uptime
// worker on every ping cycle. Reuses the update_updated_at_column() trigger
// function created by 001_create_endpoint_metrics.ts.
export async function up(db: Kysely<any>): Promise<void> {
   await db.schema
      .createTable("uptime_checks")
      .ifNotExists()
      .addColumn("id", "bigserial", (col) => col.primaryKey())
      .addColumn("monitor_id", "varchar(24)", (col) => col.notNull())
      .addColumn("client_id", "varchar(24)", (col) => col.notNull())
      .addColumn("time_bucket", "timestamptz", (col) => col.notNull())
      .addColumn("total_checks", "integer", (col) => col.defaultTo(0))
      .addColumn("success_checks", "integer", (col) => col.defaultTo(0))
      .addColumn("total_latency", "double precision", (col) => col.defaultTo(0.0))
      .addColumn("min_latency", "double precision", (col) => col.defaultTo(0.0))
      .addColumn("max_latency", "double precision", (col) => col.defaultTo(0.0))
      .addColumn("last_status_code", "integer")
      .addColumn("last_error", "varchar(500)")
      .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`current_timestamp`))
      .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`current_timestamp`))
      .addUniqueConstraint("uq_uptime_checks_bucket", ["monitor_id", "time_bucket"])
      .execute();

   await db.schema
      .createIndex("idx_uptime_checks_client_time")
      .ifNotExists()
      .on("uptime_checks")
      .columns(["client_id", "time_bucket"])
      .execute();

   await db.schema
      .createIndex("idx_uptime_checks_monitor_time")
      .ifNotExists()
      .on("uptime_checks")
      .columns(["monitor_id", "time_bucket"])
      .execute();

   await sql`DROP TRIGGER IF EXISTS update_uptime_checks_updated_at ON uptime_checks`.execute(db);

   await sql`
      CREATE TRIGGER update_uptime_checks_updated_at
      BEFORE UPDATE ON uptime_checks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
   await sql`DROP TRIGGER IF EXISTS update_uptime_checks_updated_at ON uptime_checks`.execute(db);
   await db.schema.dropTable("uptime_checks").ifExists().execute();
}
