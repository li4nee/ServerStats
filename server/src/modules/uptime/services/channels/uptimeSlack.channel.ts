import logger from "../../../../shared/config/logger.config";
import { IUptimeAlertChannel, UptimeDispatchPayload } from "./uptimeAlertChannel.interface";
import { postJson } from "./httpPost.util";

export class UptimeSlackChannel implements IUptimeAlertChannel {
   readonly type = "slack";

   async dispatch(config: Record<string, unknown>, payload: UptimeDispatchPayload): Promise<void> {
      const webhookUrl = config.webhook_url as string;
      if (!webhookUrl) {
         logger.warn("[UptimeSlackChannel] Missing 'webhook_url' in config. Skipping.");
         return;
      }

      const body = {
         text: `*Uptime Alert: ${payload.monitor.name}*`,
         attachments: [
            {
               color: payload.reason === "recovery" ? "good" : "danger",
               fields: [
                  { title: "Target URL", value: payload.monitor.targetUrl, short: false },
                  { title: "Reason", value: payload.reason, short: true },
                  { title: "Fired At", value: payload.firedAt, short: true },
                  { title: "Message", value: payload.message, short: false },
                  {
                     title: "Details",
                     value: `Status: ${payload.stats.statusCode ?? "n/a"} | Latency: ${payload.stats.latencyMs}ms | Consecutive failures: ${payload.stats.consecutiveFailures}`,
                     short: false,
                  },
               ],
            },
         ],
      };

      await postJson(webhookUrl, body);
      logger.info(`[UptimeSlackChannel] Dispatched for monitor ${payload.monitor.id}`);
   }
}
