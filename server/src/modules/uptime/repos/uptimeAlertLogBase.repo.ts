export abstract class UptimeAlertLogBaseRepo<T> {
   abstract create(data: Record<string, any>): Promise<T>;
   abstract findByMonitorId(monitorId: string, limit: number, cursor?: string): Promise<{ data: T[]; nextCursor?: string }>;
   abstract deleteByMonitorId(monitorId: string): Promise<void>;
}
