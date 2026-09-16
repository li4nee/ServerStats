import logger from "../../../shared/config/logger.config";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { UptimeAlertLogDocument } from "../../../shared/infra/db/mongo/models/uptimeAlertLog.model";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { UptimeAlertLogBaseRepo } from "../repos/uptimeAlertLogBase.repo";
import { UptimeMonitorBaseRepo } from "../repos/uptimeMonitorBase.repo";
import { AlertConditionsType } from "../dtos/createMonitor.dto";
import { UptimeDispatchPayload } from "./channels/uptimeAlertChannel.interface";

const DEFAULT_COOLDOWN_MINUTES = 60;
const DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD = 2;

function alertConditions(monitor: UptimeMonitorDocument): AlertConditionsType {
   return (monitor.alertConditions ?? {}) as AlertConditionsType;
}

export class UptimeAlertService {
   private alertLogRepo: UptimeAlertLogBaseRepo<UptimeAlertLogDocument>;
   private monitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>;

   constructor(
      alertLogRepo: UptimeAlertLogBaseRepo<UptimeAlertLogDocument>,
      monitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>,
   ) {
      if (!alertLogRepo || !monitorRepo) {
         throw new ResourceNotInitializedError("[UptimeAlertService] All dependencies must be provided.");
      }
      this.alertLogRepo = alertLogRepo;
      this.monitorRepo = monitorRepo;
   }

   getConsecutiveFailuresThreshold(monitor: UptimeMonitorDocument): number {
      return alertConditions(monitor).consecutiveFailuresThreshold ?? DEFAULT_CONSECUTIVE_FAILURES_THRESHOLD;
   }

   getResponseTimeThresholdMs(monitor: UptimeMonitorDocument): number | undefined {
      return alertConditions(monitor).responseTimeThresholdMs;
   }

   shouldNotifyOnRecovery(monitor: UptimeMonitorDocument): boolean {
      return alertConditions(monitor).notifyOnRecovery === true;
   }

   isInCooldown(monitor: UptimeMonitorDocument): boolean {
      const cooldownMinutes = alertConditions(monitor).cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES;
      const lastAlertedAt = monitor.lastAlertedAt as Date | null | undefined;

      if (!lastAlertedAt) return false;

      const cooldownMs = cooldownMinutes * 60 * 1000;
      const elapsed = Date.now() - new Date(lastAlertedAt).getTime();
      return elapsed < cooldownMs;
   }

   /** Records the fire in the audit log and, for repeatable reasons (down/slow_response), bumps
    * lastAlertedAt to start the cooldown window. Recovery doesn't repeat, so it never consumes cooldown. */
   async recordFire(
      monitor: UptimeMonitorDocument,
      reason: UptimeDispatchPayload["reason"],
      message: string,
      stats: UptimeDispatchPayload["stats"],
      channelsNotified: string[],
   ): Promise<void> {
      const now = new Date();

      try {
         await this.alertLogRepo.create({
            monitorId: monitor._id,
            clientId: monitor.clientId,
            firedAt: now,
            reason,
            message,
            stats,
            channelsNotified,
         });
      } catch (error) {
         logger.error(`[UptimeAlertService] Failed to create alert log for monitor ${monitor._id}`, { error });
         throw error;
      }

      if (reason === "recovery") return;

      try {
         await this.monitorRepo.update(monitor._id.toString(), { lastAlertedAt: now });
      } catch (error) {
         logger.error(`[UptimeAlertService] Failed to update lastAlertedAt for monitor ${monitor._id}`, { error });
         // Non-fatal: alert log is written; cooldown may not suppress correctly next cycle but that is acceptable
      }
   }

   async getHistory(
      monitorId: string,
      limit: number = 20,
      cursor?: string,
   ): Promise<{ data: UptimeAlertLogDocument[]; nextCursor?: string }> {
      return this.alertLogRepo.findByMonitorId(monitorId, limit, cursor);
   }
}
