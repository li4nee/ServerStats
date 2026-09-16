export interface UptimeDispatchPayload {
   monitor: {
      id: string;
      name: string;
      targetUrl: string;
      clientId: string;
   };
   reason: "down" | "slow_response" | "recovery";
   message: string;
   firedAt: string;
   stats: {
      statusCode: number | null;
      latencyMs: number;
      consecutiveFailures: number;
      error: string | null;
   };
}

export interface IUptimeAlertChannel {
   readonly type: string;
   dispatch(config: Record<string, unknown>, payload: UptimeDispatchPayload): Promise<void>;
}
