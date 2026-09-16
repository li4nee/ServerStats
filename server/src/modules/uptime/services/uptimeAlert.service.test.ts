import { UptimeAlertService } from "./uptimeAlert.service";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";

function makeMonitor(overrides: Partial<Record<string, unknown>> = {}): UptimeMonitorDocument {
   return {
      _id: { toString: () => "monitor-1" },
      clientId: { toString: () => "client-1" },
      name: "My Monitor",
      lastStatus: "unknown",
      lastAlertedAt: null,
      alertConditions: undefined,
      ...overrides,
   } as unknown as UptimeMonitorDocument;
}

function makeService() {
   const alertLogRepo = { create: jest.fn().mockResolvedValue(undefined), findByMonitorId: jest.fn() };
   const monitorRepo = { update: jest.fn().mockResolvedValue(null) };
   const service = new UptimeAlertService(alertLogRepo as any, monitorRepo as any);
   return { service, alertLogRepo, monitorRepo };
}

describe("UptimeAlertService", () => {
   it("throws ResourceNotInitializedError when a dependency is missing", () => {
      expect(() => new UptimeAlertService(undefined as any, {} as any)).toThrow(ResourceNotInitializedError);
   });

   describe("getConsecutiveFailuresThreshold / getResponseTimeThresholdMs / shouldNotifyOnRecovery", () => {
      it("defaults to 2 consecutive failures when unset", () => {
         const { service } = makeService();
         expect(service.getConsecutiveFailuresThreshold(makeMonitor())).toBe(2);
      });

      it("honors an overridden consecutiveFailuresThreshold", () => {
         const { service } = makeService();
         const monitor = makeMonitor({ alertConditions: { consecutiveFailuresThreshold: 5 } });
         expect(service.getConsecutiveFailuresThreshold(monitor)).toBe(5);
      });

      it("responseTimeThreshold and notifyOnRecovery are off by default", () => {
         const { service } = makeService();
         const monitor = makeMonitor();
         expect(service.getResponseTimeThresholdMs(monitor)).toBeUndefined();
         expect(service.shouldNotifyOnRecovery(monitor)).toBe(false);
      });
   });

   describe("isInCooldown", () => {
      it("is false when the monitor has never alerted", () => {
         const { service } = makeService();
         expect(service.isInCooldown(makeMonitor({ lastAlertedAt: null }))).toBe(false);
      });

      it("is true just inside the default 60-minute cooldown window", () => {
         const { service } = makeService();
         const lastAlertedAt = new Date(Date.now() - 59 * 60 * 1000);
         expect(service.isInCooldown(makeMonitor({ lastAlertedAt }))).toBe(true);
      });

      it("is false just past the default 60-minute cooldown window", () => {
         const { service } = makeService();
         const lastAlertedAt = new Date(Date.now() - 61 * 60 * 1000);
         expect(service.isInCooldown(makeMonitor({ lastAlertedAt }))).toBe(false);
      });

      it("honors an overridden cooldownMinutes", () => {
         const { service } = makeService();
         const lastAlertedAt = new Date(Date.now() - 10 * 60 * 1000);
         const monitor = makeMonitor({ lastAlertedAt, alertConditions: { cooldownMinutes: 5 } });
         expect(service.isInCooldown(monitor)).toBe(false);
      });
   });

   describe("recordFire", () => {
      const stats = { statusCode: 500, latencyMs: 100, consecutiveFailures: 2, error: "boom" };

      it("writes an alert log and bumps lastAlertedAt for a 'down' fire", async () => {
         const { service, alertLogRepo, monitorRepo } = makeService();
         const monitor = makeMonitor();

         await service.recordFire(monitor, "down", "it's down", stats, ["webhook"]);

         expect(alertLogRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ reason: "down", message: "it's down", channelsNotified: ["webhook"] }),
         );
         expect(monitorRepo.update).toHaveBeenCalledWith("monitor-1", { lastAlertedAt: expect.any(Date) });
      });

      it("writes an alert log but does NOT bump lastAlertedAt for a 'recovery' fire", async () => {
         const { service, alertLogRepo, monitorRepo } = makeService();
         const monitor = makeMonitor();

         await service.recordFire(monitor, "recovery", "back up", stats, ["email"]);

         expect(alertLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reason: "recovery" }));
         expect(monitorRepo.update).not.toHaveBeenCalled();
      });
   });
});
