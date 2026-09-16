export interface UptimeCheckResultInput {
   monitorId: string;
   clientId: string;
   timeBucket: Date;
   success: boolean;
   latencyMs: number;
   statusCode: number | null;
   error: string | null;
}

export interface UptimeSummary {
   totalChecks: number;
   successChecks: number;
   uptimePercent: number;
   avgLatency: number;
}

export interface UptimeTimeSeriesBucket {
   timeBucket: Date;
   totalChecks: number;
   successChecks: number;
   uptimePercent: number;
   avgLatency: number;
}

export abstract class UptimeCheckBaseRepo {
   /** Upserts one minute-bucket row per (monitorId, timeBucket), accumulating totals. */
   abstract upsertCheckResult(result: UptimeCheckResultInput): Promise<void>;

   abstract getUptimeSummary(monitorId: string, startTime?: Date, endTime?: Date): Promise<UptimeSummary>;

   abstract getTimeSeries(
      monitorId: string,
      startTime?: Date,
      endTime?: Date,
      bucket?: "minute" | "hour" | "day",
   ): Promise<UptimeTimeSeriesBucket[]>;
}
