import { globalConfig } from "../../../shared/config/global.config";
import logger from "../../../shared/config/logger.config";
import { RetryStrategy } from "../../../shared/infra/resilience/retryStrategy.infra";
import { RetryStrategyOptions } from "../../../shared/typings/retry.typings";
import UptimeWorkerDependenciesContainer from "./dependencies/uptimeWorker.dependency";

const uptimeWorkerDependencies = UptimeWorkerDependenciesContainer.init();

class UptimeWorkerStartup {
   private static isShuttingDown = false;

   private static async shutdown(signal: string) {
      if (this.isShuttingDown) {
         return;
      }

      this.isShuttingDown = true;
      logger.info(`${signal} received. Shutting down uptime worker gracefully...`);

      try {
         await uptimeWorkerDependencies.worker.stop();
         logger.info("Uptime Worker stopped successfully. Exiting process.");
         process.exit(0);
      } catch (error) {
         logger.error("Error during uptime worker shutdown:", { error: (error as Error).message });
         process.exit(1);
      }
   }

   private static async startWorkerWithRetry() {
      const retryStrategyOptions: RetryStrategyOptions = {
         maxRetries: globalConfig.uptimeWorker.startupRetryStrategyOptions.maxRetries ?? 5,
         baseRetryDelayInMs: globalConfig.uptimeWorker.startupRetryStrategyOptions.baseRetryDelayInMs ?? 1000,
         maxRetryDelayInMs: globalConfig.uptimeWorker.startupRetryStrategyOptions.maxRetryDelayInMs ?? 30000,
         jitterFactor: globalConfig.uptimeWorker.startupRetryStrategyOptions.jitterFactor ?? 0.3,
      };
      const retryStrategy = new RetryStrategy(retryStrategyOptions);
      const maxRetries = retryStrategyOptions.maxRetries ?? 5;

      let attempt = 0;

      while (attempt < maxRetries) {
         try {
            await uptimeWorkerDependencies.worker.start();
            logger.info("[Uptime Worker] Started successfully");
            return;
         } catch (error) {
            attempt++;
            logger.error("[Uptime Worker] Failed to start", {
               attempt,
               error: (error as Error).message,
            });

            if (!retryStrategy.shouldRetry(attempt)) {
               logger.error("[Uptime Worker] Max startup retry attempts reached. Exiting process.");
               process.exit(1);
            }

            const delay = retryStrategy.getRetryDelay(attempt);
            logger.info(`[Uptime Worker] Retrying startup in ${delay} ms`);
            await retryStrategy.waitForRetry(attempt);
         }
      }

      logger.error("[Uptime Worker] Failed to start after retry loop. Exiting process.");
      process.exit(1);
   }

   static registerProcessHandlers() {
      process.on("unhandledRejection", (reason, promise) => {
         logger.error("Unhandled Rejection at:", { promise, reason });
         process.exit(1);
      });

      process.on("uncaughtException", (error) => {
         logger.error("Uncaught Exception thrown:", { error });
         process.exit(1);
      });

      process.on("SIGINT", async () => {
         await this.shutdown("SIGINT");
      });

      process.on("SIGTERM", async () => {
         await this.shutdown("SIGTERM");
      });
   }

   static async start() {
      this.registerProcessHandlers();
      await this.startWorkerWithRetry();
   }
}

UptimeWorkerStartup.start().catch((error) => {
   logger.error("Failed to start UptimeWorkerStartup", { error: (error as Error).message });
   process.exit(1);
});
