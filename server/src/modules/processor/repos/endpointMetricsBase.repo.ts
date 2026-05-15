import { OverviewStats, TimeSeriesBucket } from "../../../modules/analytics/dtos/analyticsResponse.dto";

export abstract class EndPointMetricsBaseRepo<T> {
   abstract upsertEndpointMetrics(metrixData: T): Promise<void>;

   abstract findWithFilters(
      filters: Partial<T>,
      limit: number,
      offset?: number,
      sortBy?: string,
      sortOrder?: "ASC" | "DESC",
   ): Promise<T[]>;

   abstract getTopEndpointsByTotalHits(limit: number, startTime?: Date, endTime?: Date, clientId?: string): Promise<T[]>;

   abstract getTopEndpointsByErrorHits(limit: number, startTime?: Date, endTime?: Date, clientId?: string): Promise<T[]>;

   abstract getTopEndpointsByTotalLatency(limit: number, startTime?: Date, endTime?: Date, clientId?: string): Promise<T[]>;

   abstract getTopEndpointsByAverageLatency(limit: number, startTime?: Date, endTime?: Date, clientId?: string): Promise<T[]>;

   abstract getOverviewStats(clientId: string, startTime?: Date, endTime?: Date): Promise<OverviewStats>;

   abstract getTimeSeries(clientId: string, startTime?: Date, endTime?: Date, serviceName?: string): Promise<TimeSeriesBucket[]>;
}
