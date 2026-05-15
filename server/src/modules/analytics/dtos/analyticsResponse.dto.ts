export interface EndpointSummary {
   service_name: string;
   endpoint: string;
   method: string;
   total_hits: number;
   error_hits: number;
   error_rate: number;
   avg_latency: number;
   min_latency: number;
   max_latency: number;
}

export interface TimeSeriesBucket {
   time_bucket: Date;
   total_hits: number;
   error_hits: number;
   avg_latency: number;
}

export interface OverviewStats {
   total_hits: number;
   total_errors: number;
   error_rate: number;
   avg_latency: number;
   unique_endpoints: number;
}
