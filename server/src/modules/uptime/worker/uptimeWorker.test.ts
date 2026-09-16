import { UptimeWorker } from "./uptimeWorker";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";

function makeMonitor(overrides: Partial<Record<string, unknown>> = {}): UptimeMonitorDocument {
   return {
      _id: { toString: () => overrides.id ?? "monitor-1" },
      clientId: { toString: () => "client-1" },
      targetUrl: "https://example.test/health",
      httpMethod: "GET",
      timeoutMs: 5000,
      expectedStatusCodes: [200],
      intervalMs: 60000,
      lastCheckedAt: null,
      consecutiveFailures: 0,
      ...overrides,
   } as unknown as UptimeMonitorDocument;
}

function makeDeps(overrides: Partial<Record<string, unknown>> = {}) {
   return {
      uptimeMonitorRepo: {
         findEnabled: jest.fn().mockResolvedValue({ data: [] }),
         update: jest.fn().mockResolvedValue(null),
      },
      uptimeCheckRepo: {
         upsertCheckResult: jest.fn().mockResolvedValue(undefined),
      },
      pinger: {
         ping: jest.fn().mockResolvedValue({ status: "up", statusCode: 200, latencyMs: 12, error: null }),
      },
      alertDispatcher: {
         dispatch: jest.fn().mockResolvedValue(["webhook"]),
      },
      alertService: {
         getConsecutiveFailuresThreshold: jest.fn().mockReturnValue(2),
         getResponseTimeThresholdMs: jest.fn().mockReturnValue(undefined),
         shouldNotifyOnRecovery: jest.fn().mockReturnValue(false),
         isInCooldown: jest.fn().mockReturnValue(false),
         recordFire: jest.fn().mockResolvedValue(undefined),
      },
      mongoDBConnection: { connect: jest.fn().mockResolvedValue(undefined), disconnect: jest.fn().mockResolvedValue(undefined) },
      postgresConnection: {
         testConnection: jest.fn().mockResolvedValue(undefined),
         disconnect: jest.fn().mockResolvedValue(undefined),
      },
      ...overrides,
   } as any;
}

describe("UptimeWorker", () => {
   it("throws ResourceNotInitializedError when a dependency is missing", () => {
      const deps = makeDeps();
      delete deps.pinger;

      expect(() => new UptimeWorker(deps)).toThrow(ResourceNotInitializedError);
   });

   it("pings every due monitor in a page and records up/down stats", async () => {
      const monitors = [makeMonitor({ id: "m1" }), makeMonitor({ id: "m2" })];
      const deps = makeDeps({
         uptimeMonitorRepo: {
            findEnabled: jest.fn().mockResolvedValue({ data: monitors }),
            update: jest.fn().mockResolvedValue(null),
         },
         pinger: {
            ping: jest
               .fn()
               .mockResolvedValueOnce({ status: "up", statusCode: 200, latencyMs: 10, error: null })
               .mockResolvedValueOnce({ status: "down", statusCode: 500, latencyMs: 20, error: "Unexpected status code 500" }),
         },
      });
      const worker = new UptimeWorker(deps);

      await worker.start();
      await worker.stop();

      const stats = worker.getStats();
      expect(stats.totalMonitorsChecked).toBe(2);
      expect(stats.totalUp).toBe(1);
      expect(stats.totalDown).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(deps.uptimeCheckRepo.upsertCheckResult).toHaveBeenCalledTimes(2);
      expect(deps.uptimeMonitorRepo.update).toHaveBeenCalledTimes(2);
   });

   it("skips a monitor whose interval hasn't elapsed yet", async () => {
      const dueMonitor = makeMonitor({ id: "due", lastCheckedAt: null });
      const notDueMonitor = makeMonitor({ id: "not-due", lastCheckedAt: new Date(), intervalMs: 300000 });
      const deps = makeDeps({
         uptimeMonitorRepo: {
            findEnabled: jest.fn().mockResolvedValue({ data: [dueMonitor, notDueMonitor] }),
            update: jest.fn().mockResolvedValue(null),
         },
      });
      const worker = new UptimeWorker(deps);

      await worker.start();
      await worker.stop();

      expect(worker.getStats().totalMonitorsChecked).toBe(1);
      expect(deps.pinger.ping).toHaveBeenCalledTimes(1);
   });

   it("one monitor failing doesn't stop the rest of the page from being checked", async () => {
      const monitors = [makeMonitor({ id: "fails" }), makeMonitor({ id: "ok" })];
      const deps = makeDeps({
         uptimeMonitorRepo: {
            findEnabled: jest.fn().mockResolvedValue({ data: monitors }),
            update: jest.fn().mockResolvedValue(null),
         },
         uptimeCheckRepo: {
            upsertCheckResult: jest.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce(undefined),
         },
      });
      const worker = new UptimeWorker(deps);

      await worker.start();
      await worker.stop();

      const stats = worker.getStats();
      expect(stats.totalErrors).toBe(1);
      expect(deps.uptimeCheckRepo.upsertCheckResult).toHaveBeenCalledTimes(2);
   });

   it("a page-fetch failure doesn't crash the cycle", async () => {
      const deps = makeDeps({
         uptimeMonitorRepo: {
            findEnabled: jest.fn().mockRejectedValue(new Error("mongo down")),
            update: jest.fn(),
         },
      });
      const worker = new UptimeWorker(deps);

      await expect(worker.start()).resolves.toBeUndefined();
      await worker.stop();

      expect(worker.getStats().totalErrors).toBe(1);
   });

   describe("alert firing", () => {
      it("fires a 'down' alert exactly when consecutiveFailures first reaches the threshold", async () => {
         const monitor = makeMonitor({ id: "m1", consecutiveFailures: 1 }); // one more failure -> hits default threshold of 2
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "down", statusCode: 500, latencyMs: 20, error: "boom" }) },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.alertDispatcher.dispatch).toHaveBeenCalledWith(monitor, expect.objectContaining({ reason: "down" }));
         expect(deps.alertService.recordFire).toHaveBeenCalledWith(monitor, "down", expect.any(String), expect.any(Object), [
            "webhook",
         ]);
         expect(worker.getStats().totalAlertsFired).toBe(1);
      });

      it("does not fire before the failure threshold is reached", async () => {
         const monitor = makeMonitor({ id: "m1", consecutiveFailures: 0 }); // first failure only reaches 1, threshold is 2
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "down", statusCode: 500, latencyMs: 20, error: "boom" }) },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.alertDispatcher.dispatch).not.toHaveBeenCalled();
         expect(worker.getStats().totalAlertsFired).toBe(0);
      });

      it("suppresses a 'down' alert while still in cooldown", async () => {
         const monitor = makeMonitor({ id: "m1", consecutiveFailures: 1 });
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "down", statusCode: 500, latencyMs: 20, error: "boom" }) },
            alertService: {
               getConsecutiveFailuresThreshold: jest.fn().mockReturnValue(2),
               getResponseTimeThresholdMs: jest.fn().mockReturnValue(undefined),
               shouldNotifyOnRecovery: jest.fn().mockReturnValue(false),
               isInCooldown: jest.fn().mockReturnValue(true),
               recordFire: jest.fn().mockResolvedValue(undefined),
            },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.alertDispatcher.dispatch).not.toHaveBeenCalled();
      });

      it("fires a 'recovery' alert only when notifyOnRecovery is enabled and the monitor was down", async () => {
         const monitor = makeMonitor({ id: "m1", lastStatus: "down", consecutiveFailures: 3 });
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "up", statusCode: 200, latencyMs: 10, error: null }) },
            alertService: {
               getConsecutiveFailuresThreshold: jest.fn().mockReturnValue(2),
               getResponseTimeThresholdMs: jest.fn().mockReturnValue(undefined),
               shouldNotifyOnRecovery: jest.fn().mockReturnValue(true),
               isInCooldown: jest.fn().mockReturnValue(false),
               recordFire: jest.fn().mockResolvedValue(undefined),
            },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.alertDispatcher.dispatch).toHaveBeenCalledWith(monitor, expect.objectContaining({ reason: "recovery" }));
      });

      it("fires a 'slow_response' alert when latency exceeds the configured threshold", async () => {
         const monitor = makeMonitor({ id: "m1", lastStatus: "up" });
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "up", statusCode: 200, latencyMs: 5000, error: null }) },
            alertService: {
               getConsecutiveFailuresThreshold: jest.fn().mockReturnValue(2),
               getResponseTimeThresholdMs: jest.fn().mockReturnValue(1000),
               shouldNotifyOnRecovery: jest.fn().mockReturnValue(false),
               isInCooldown: jest.fn().mockReturnValue(false),
               recordFire: jest.fn().mockResolvedValue(undefined),
            },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.alertDispatcher.dispatch).toHaveBeenCalledWith(monitor, expect.objectContaining({ reason: "slow_response" }));
      });

      it("an alert dispatch failure doesn't block the monitor's status write-back", async () => {
         const monitor = makeMonitor({ id: "m1", consecutiveFailures: 1 });
         const deps = makeDeps({
            uptimeMonitorRepo: {
               findEnabled: jest.fn().mockResolvedValue({ data: [monitor] }),
               update: jest.fn().mockResolvedValue(null),
            },
            pinger: { ping: jest.fn().mockResolvedValue({ status: "down", statusCode: 500, latencyMs: 20, error: "boom" }) },
            alertDispatcher: { dispatch: jest.fn().mockRejectedValue(new Error("dispatch failed")) },
         });
         const worker = new UptimeWorker(deps);

         await worker.start();
         await worker.stop();

         expect(deps.uptimeMonitorRepo.update).toHaveBeenCalledWith(
            "m1",
            expect.objectContaining({ lastStatus: "down", consecutiveFailures: 2 }),
         );
         expect(worker.getStats().totalErrors).toBe(0);
      });
   });

   it("stop() clears the poll timer and disconnects both DB connections", async () => {
      const deps = makeDeps();
      const worker = new UptimeWorker(deps);

      await worker.start();
      await worker.stop();

      expect(deps.mongoDBConnection.disconnect).toHaveBeenCalledTimes(1);
      expect(deps.postgresConnection.disconnect).toHaveBeenCalledTimes(1);
      expect(worker.getStats().isRunning).toBe(false);
   });
});
