import { sql } from "kysely";
import { PostgresDB } from "../../../shared/infra/db/postgres/postgresClient";
import logger from "../../../shared/config/logger.config";
import { UptimeCheckBaseRepo, UptimeCheckResultInput, UptimeSummary, UptimeTimeSeriesBucket } from "./uptimeCheckBase.repo";

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function toUptimePercent(totalChecks: number, successChecks: number): number {
   return totalChecks > 0 ? parseFloat(((successChecks / totalChecks) * 100).toFixed(2)) : 0;
}

export class PgUptimeCheckRepo extends UptimeCheckBaseRepo {
   async upsertCheckResult(result: UptimeCheckResultInput): Promise<void> {
      try {
         const { monitorId, clientId, timeBucket, success, latencyMs, statusCode, error } = result;

         await PostgresDB.insertInto("uptime_checks")
            .values({
               id: sql`DEFAULT`,
               monitor_id: monitorId,
               client_id: clientId,
               time_bucket: timeBucket,
               total_checks: 1,
               success_checks: success ? 1 : 0,
               total_latency: latencyMs,
               min_latency: latencyMs,
               max_latency: latencyMs,
               last_status_code: statusCode,
               last_error: error,
               created_at: sql`NOW()`,
               updated_at: sql`NOW()`,
            })
            .onConflict((oc) =>
               oc.columns(["monitor_id", "time_bucket"]).doUpdateSet({
                  total_checks: sql`uptime_checks.total_checks + EXCLUDED.total_checks`,
                  success_checks: sql`uptime_checks.success_checks + EXCLUDED.success_checks`,
                  total_latency: sql`uptime_checks.total_latency + EXCLUDED.total_latency`,
                  min_latency: sql`LEAST(uptime_checks.min_latency, EXCLUDED.min_latency)`,
                  max_latency: sql`GREATEST(uptime_checks.max_latency, EXCLUDED.max_latency)`,
                  last_status_code: sql`EXCLUDED.last_status_code`,
                  last_error: sql`EXCLUDED.last_error`,
                  updated_at: sql`NOW()`,
               }),
            )
            .execute();
      } catch (error) {
         logger.error("Error upserting uptime check", { error, result });
         throw error;
      }
   }

   async getUptimeSummary(monitorId: string, startTime?: Date, endTime?: Date): Promise<UptimeSummary> {
      try {
         startTime ??= new Date(Date.now() - DEFAULT_LOOKBACK_MS);

         let query = PostgresDB.selectFrom("uptime_checks")
            .select([
               sql<number>`COALESCE(SUM(total_checks), 0)`.as("total_checks"),
               sql<number>`COALESCE(SUM(success_checks), 0)`.as("success_checks"),
               sql<number>`COALESCE(SUM(total_latency)::float / NULLIF(SUM(total_checks), 0), 0)`.as("avg_latency"),
            ])
            .where("monitor_id", "=", monitorId)
            .where("time_bucket", ">=", startTime);

         if (endTime) {
            query = query.where("time_bucket", "<=", endTime);
         }

         const row = await query.executeTakeFirstOrThrow();

         const totalChecks = Number(row.total_checks);
         const successChecks = Number(row.success_checks);

         return {
            totalChecks,
            successChecks,
            uptimePercent: toUptimePercent(totalChecks, successChecks),
            avgLatency: parseFloat(Number(row.avg_latency).toFixed(2)),
         };
      } catch (error) {
         logger.error("Error getting uptime summary", { error, monitorId });
         throw error;
      }
   }

   async getTimeSeries(
      monitorId: string,
      startTime?: Date,
      endTime?: Date,
      bucket: "minute" | "hour" | "day" = "minute",
   ): Promise<UptimeTimeSeriesBucket[]> {
      try {
         startTime ??= new Date(Date.now() - DEFAULT_LOOKBACK_MS);

         const bucketExpr = bucket === "minute" ? sql<Date>`time_bucket` : sql<Date>`date_trunc(${sql.lit(bucket)}, time_bucket)`;

         let query = PostgresDB.selectFrom("uptime_checks")
            .select([
               bucketExpr.as("time_bucket"),
               sql<number>`SUM(total_checks)`.as("total_checks"),
               sql<number>`SUM(success_checks)`.as("success_checks"),
               sql<number>`COALESCE(SUM(total_latency)::float / NULLIF(SUM(total_checks), 0), 0)`.as("avg_latency"),
            ])
            .where("monitor_id", "=", monitorId)
            .where("time_bucket", ">=", startTime)
            .groupBy(bucketExpr)
            .orderBy(bucketExpr, "asc");

         if (endTime) {
            query = query.where("time_bucket", "<=", endTime);
         }

         const rows = await query.execute();

         return rows.map((row) => {
            const totalChecks = Number(row.total_checks);
            const successChecks = Number(row.success_checks);
            return {
               timeBucket: row.time_bucket,
               totalChecks,
               successChecks,
               uptimePercent: toUptimePercent(totalChecks, successChecks),
               avgLatency: parseFloat(Number(row.avg_latency).toFixed(2)),
            };
         });
      } catch (error) {
         logger.error("Error getting uptime time series", { error, monitorId });
         throw error;
      }
   }
}
