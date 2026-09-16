import { globalConfig } from "../../../shared/config/global.config";
import logger from "../../../shared/config/logger.config";
import { MongoConnection } from "../../../shared/infra/db/mongo/mongoConnection";
import { PostgresConnection } from "../../../shared/infra/db/postgres/postgresConnection";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { UptimeMonitorBaseRepo } from "../repos/uptimeMonitorBase.repo";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { UptimeCheckBaseRepo } from "../repos/uptimeCheckBase.repo";
import { PingResult, UptimePingerService } from "../services/uptimePinger.service";
import { UptimeAlertDispatcherService } from "../services/uptimeAlertDispatcher.service";
import { UptimeAlertService } from "../services/uptimeAlert.service";
import { UptimeDispatchPayload } from "../services/channels/uptimeAlertChannel.interface";

const POLL_INTERVAL_MS = globalConfig.uptimeWorker.pollIntervalMs;
const DB_MAX_RETRY_ATTEMPTS = globalConfig.uptimeWorker.mongoPostgresConnectionMaxRetryAttempts;
const CONCURRENCY = globalConfig.uptimeWorker.concurrency;

interface UptimeWorkerStats {
   totalCycles: number;
   totalMonitorsChecked: number;
   totalUp: number;
   totalDown: number;
   totalErrors: number;
   totalAlertsFired: number;
   lastCycleAt: string | null;
   lastCycleDurationMs: number | null;
}

/** Truncates to the minute — matches the uptime_checks (monitor_id, time_bucket) upsert grain. */
function toMinuteBucket(date: Date): Date {
   const bucket = new Date(date);
   bucket.setSeconds(0, 0);
   return bucket;
}

function isDue(monitor: UptimeMonitorDocument, now: number): boolean {
   if (!monitor.lastCheckedAt) return true;
   return now - new Date(monitor.lastCheckedAt).getTime() >= monitor.intervalMs;
}

/** Runs `fn` over `items` in fixed-size chunks so a page of slow/hanging targets can't serialize the whole cycle. */
async function mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
   for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map(fn));
   }
}

export class UptimeWorker {
   private uptimeMonitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>;
   private uptimeCheckRepo: UptimeCheckBaseRepo;
   private pinger: UptimePingerService;
   private alertDispatcher: UptimeAlertDispatcherService;
   private alertService: UptimeAlertService;
   private mongoDBConnection: MongoConnection;
   private postgresConnection: PostgresConnection;

   private isRunning = false;
   private pollTimer: NodeJS.Timeout | null = null;

   private stats: UptimeWorkerStats = {
      totalCycles: 0,
      totalMonitorsChecked: 0,
      totalUp: 0,
      totalDown: 0,
      totalErrors: 0,
      totalAlertsFired: 0,
      lastCycleAt: null,
      lastCycleDurationMs: null,
   };

   constructor({
      uptimeMonitorRepo,
      uptimeCheckRepo,
      pinger,
      alertDispatcher,
      alertService,
      mongoDBConnection,
      postgresConnection,
   }: {
      uptimeMonitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>;
      uptimeCheckRepo: UptimeCheckBaseRepo;
      pinger: UptimePingerService;
      alertDispatcher: UptimeAlertDispatcherService;
      alertService: UptimeAlertService;
      mongoDBConnection: MongoConnection;
      postgresConnection: PostgresConnection;
   }) {
      if (
         !uptimeMonitorRepo ||
         !uptimeCheckRepo ||
         !pinger ||
         !alertDispatcher ||
         !alertService ||
         !mongoDBConnection ||
         !postgresConnection
      ) {
         throw new ResourceNotInitializedError("[UptimeWorker] All dependencies must be provided.");
      }
      this.uptimeMonitorRepo = uptimeMonitorRepo;
      this.uptimeCheckRepo = uptimeCheckRepo;
      this.pinger = pinger;
      this.alertDispatcher = alertDispatcher;
      this.alertService = alertService;
      this.mongoDBConnection = mongoDBConnection;
      this.postgresConnection = postgresConnection;
   }

   private async connectToDatabase(): Promise<void> {
      let attempt = 0;

      while (attempt < DB_MAX_RETRY_ATTEMPTS) {
         try {
            await Promise.all([this.mongoDBConnection.connect(), this.postgresConnection.testConnection()]);
            logger.info("[UptimeWorker] Connected to DBs", { attempt: attempt + 1 });
            return;
         } catch (error) {
            attempt++;
            logger.error("[UptimeWorker] DB connection failed", { attempt, error: (error as Error).message });

            if (attempt >= DB_MAX_RETRY_ATTEMPTS) {
               throw new ResourceNotInitializedError("[UptimeWorker] DB connection failed after max retries");
            }

            const delay = Math.min(1000 * 2 ** attempt, 5000);
            await new Promise((res) => setTimeout(res, delay));
         }
      }
   }

   /** Decides whether this check should fire an alert, and if so which one. Never throws. */
   private async evaluateAndFireAlerts(
      monitor: UptimeMonitorDocument,
      result: PingResult,
      newConsecutiveFailures: number,
   ): Promise<void> {
      const isUp = result.status === "up";
      const wasDown = monitor.lastStatus === "down";
      const stats: UptimeDispatchPayload["stats"] = {
         statusCode: result.statusCode,
         latencyMs: result.latencyMs,
         consecutiveFailures: newConsecutiveFailures,
         error: result.error,
      };

      let reason: UptimeDispatchPayload["reason"] | null = null;
      let message = "";

      if (!isUp && newConsecutiveFailures === this.alertService.getConsecutiveFailuresThreshold(monitor)) {
         if (this.alertService.isInCooldown(monitor)) return;
         reason = "down";
         message = `Monitor "${monitor.name}" is down: ${result.error ?? "check failed"} (status ${result.statusCode ?? "n/a"})`;
      } else if (isUp && wasDown && this.alertService.shouldNotifyOnRecovery(monitor)) {
         reason = "recovery";
         message = `Monitor "${monitor.name}" has recovered`;
      } else if (isUp) {
         const responseTimeThresholdMs = this.alertService.getResponseTimeThresholdMs(monitor);
         if (responseTimeThresholdMs != null && result.latencyMs > responseTimeThresholdMs && !this.alertService.isInCooldown(monitor)) {
            reason = "slow_response";
            message = `Monitor "${monitor.name}" responded slowly: ${result.latencyMs}ms (threshold ${responseTimeThresholdMs}ms)`;
         }
      }

      if (!reason) return;

      try {
         const channelsNotified = await this.alertDispatcher.dispatch(monitor, { reason, message, stats });
         await this.alertService.recordFire(monitor, reason, message, stats, channelsNotified);
         this.stats.totalAlertsFired++;
      } catch (error) {
         logger.error(`[UptimeWorker] Failed to fire "${reason}" alert for monitor ${monitor._id}`, { error });
      }
   }

   private async checkMonitor(monitor: UptimeMonitorDocument): Promise<void> {
      try {
         const result = await this.pinger.ping({
            targetUrl: monitor.targetUrl,
            httpMethod: monitor.httpMethod,
            timeoutMs: monitor.timeoutMs,
            expectedStatusCodes: monitor.expectedStatusCodes,
         });

         const isUp = result.status === "up";
         const newConsecutiveFailures = isUp ? 0 : monitor.consecutiveFailures + 1;
         this.stats.totalMonitorsChecked++;
         if (isUp) this.stats.totalUp++;
         else this.stats.totalDown++;

         await this.uptimeCheckRepo.upsertCheckResult({
            monitorId: monitor._id.toString(),
            clientId: monitor.clientId.toString(),
            timeBucket: toMinuteBucket(new Date()),
            success: isUp,
            latencyMs: result.latencyMs,
            statusCode: result.statusCode,
            error: result.error,
         });

         // Alerting is an independent failure domain — a dispatch/record failure never blocks the status write-back below.
         await this.evaluateAndFireAlerts(monitor, result, newConsecutiveFailures);

         await this.uptimeMonitorRepo.update(monitor._id.toString(), {
            lastCheckedAt: new Date(),
            lastStatus: result.status,
            consecutiveFailures: newConsecutiveFailures,
         });
      } catch (error) {
         logger.error(`[UptimeWorker] Error checking monitor ${monitor._id}`, { error });
         this.stats.totalErrors++;
      }
   }

   private async runPingCycle(): Promise<void> {
      logger.info("[UptimeWorker] Starting ping cycle");
      const cycleStartedAt = Date.now();
      const now = Date.now();

      let cursor: string | undefined;

      do {
         let data: UptimeMonitorDocument[];
         let nextCursor: string | undefined;

         try {
            const result = await this.uptimeMonitorRepo.findEnabled(100, cursor);
            data = result.data;
            nextCursor = result.nextCursor;
         } catch (error) {
            logger.error("[UptimeWorker] Error fetching enabled monitors", { error });
            this.stats.totalErrors++;
            break;
         }

         const dueMonitors = data.filter((monitor) => isDue(monitor, now));
         await mapWithConcurrency(dueMonitors, CONCURRENCY, (monitor) => this.checkMonitor(monitor));

         cursor = nextCursor;
      } while (cursor);

      this.stats.totalCycles++;
      this.stats.lastCycleAt = new Date().toISOString();
      this.stats.lastCycleDurationMs = Date.now() - cycleStartedAt;
      logger.info(`[UptimeWorker] Ping cycle complete in ${this.stats.lastCycleDurationMs}ms`);
   }

   private schedulePoll(): void {
      this.pollTimer = setTimeout(async () => {
         if (!this.isRunning) return;

         try {
            await this.runPingCycle();
         } catch (error) {
            logger.error("[UptimeWorker] Unhandled error in ping cycle", { error });
         }

         if (this.isRunning) {
            this.schedulePoll();
         }
      }, POLL_INTERVAL_MS);
   }

   async start(): Promise<void> {
      if (this.isRunning) return;

      this.isRunning = true;

      try {
         await this.connectToDatabase();
         logger.info("[UptimeWorker] Started. First ping cycle in " + POLL_INTERVAL_MS + "ms");
         // Run immediately on start, then schedule recurring polls
         await this.runPingCycle();
         this.schedulePoll();
      } catch (error) {
         logger.error("[UptimeWorker] Failed to start", { error: (error as Error).message });
         await this.stop();
         throw error;
      }
   }

   async stop(): Promise<void> {
      this.isRunning = false;

      if (this.pollTimer) {
         clearTimeout(this.pollTimer);
         this.pollTimer = null;
      }

      try {
         await this.mongoDBConnection.disconnect();
         await this.postgresConnection.disconnect();
         logger.info("[UptimeWorker] Stopped");
      } catch (error) {
         logger.error("[UptimeWorker] Error during stop", { error: (error as Error).message });
      }
   }

   getStats(): UptimeWorkerStats & { isRunning: boolean } {
      return { ...this.stats, isRunning: this.isRunning };
   }
}
