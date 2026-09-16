export interface PingTarget {
   targetUrl: string;
   httpMethod: string;
   timeoutMs: number;
   expectedStatusCodes: number[];
}

export interface PingResult {
   status: "up" | "down";
   statusCode: number | null;
   latencyMs: number;
   error: string | null;
}

export class UptimePingerService {
   async ping(target: PingTarget): Promise<PingResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), target.timeoutMs);
      const startedAt = Date.now();

      try {
         const response = await fetch(target.targetUrl, { method: target.httpMethod, signal: controller.signal });
         const latencyMs = Date.now() - startedAt;
         const isUp = target.expectedStatusCodes.includes(response.status);

         return {
            status: isUp ? "up" : "down",
            statusCode: response.status,
            latencyMs,
            error: isUp ? null : `Unexpected status code ${response.status}`,
         };
      } catch (error) {
         const latencyMs = Date.now() - startedAt;
         const isAbort = error instanceof Error && error.name === "AbortError";

         return {
            status: "down",
            statusCode: null,
            latencyMs,
            error: isAbort ? `Request timed out after ${target.timeoutMs}ms` : (error as Error).message,
         };
      } finally {
         clearTimeout(timer);
      }
   }
}
