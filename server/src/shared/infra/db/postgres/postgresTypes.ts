export interface EndpointMetrics {
   id: number;
   client_id: string;
   service_name: string;
   endpoint: string;
   method: string;
   time_bucket: Date;
   total_hits: number;
   error_hits: number;
   min_latency: number;
   max_latency: number;
   total_latency: number;
   created_at: Date;
   updated_at: Date;
}

export interface UptimeCheck {
   id: number;
   monitor_id: string;
   client_id: string;
   time_bucket: Date;
   total_checks: number;
   success_checks: number;
   total_latency: number;
   min_latency: number;
   max_latency: number;
   last_status_code: number | null;
   last_error: string | null;
   created_at: Date;
   updated_at: Date;
}

export interface DB {
   endpoint_metrics: EndpointMetrics;
   uptime_checks: UptimeCheck;
}
