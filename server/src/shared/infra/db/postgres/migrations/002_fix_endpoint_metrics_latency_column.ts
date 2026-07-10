import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
   const hasTotalLatency = await sql<{ exists: boolean }>`
      SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'endpoint_metrics' AND column_name = 'total_latency'
      ) as exists
   `.execute(db);

   if (hasTotalLatency.rows[0]?.exists) return;

   const hasAvgLatency = await sql<{ exists: boolean }>`
      SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'endpoint_metrics' AND column_name = 'avg_latency'
      ) as exists
   `.execute(db);

   if (hasAvgLatency.rows[0]?.exists) {
      await db.schema.alterTable("endpoint_metrics").renameColumn("avg_latency", "total_latency").execute();
   } else {
      await db.schema
         .alterTable("endpoint_metrics")
         .addColumn("total_latency", "double precision", (col) => col.defaultTo(0.0))
         .execute();
   }
}

export async function down(db: Kysely<any>): Promise<void> {
   await db.schema.alterTable("endpoint_metrics").renameColumn("total_latency", "avg_latency").execute();
}
