import logger from "../../../../shared/config/logger.config";
import { IUptimeAlertChannel, UptimeDispatchPayload } from "./uptimeAlertChannel.interface";
import { postJson } from "./httpPost.util";

export class UptimeDiscordChannel implements IUptimeAlertChannel {
   readonly type = "discord";

   async dispatch(config: Record<string, unknown>, payload: UptimeDispatchPayload): Promise<void> {
      const webhookUrl = config.webhook_url as string;
      if (!webhookUrl) {
         logger.warn("[UptimeDiscordChannel] Missing 'webhook_url' in config. Skipping.");
         return;
      }

      const body = {
         embeds: [
            {
               title: `Uptime Alert: ${payload.monitor.name}`,
               color: payload.reason === "recovery" ? 3066993 : 15158332,
               fields: [
                  { name: "Target URL", value: payload.monitor.targetUrl, inline: false },
                  { name: "Reason", value: payload.reason, inline: true },
                  { name: "Fired At", value: payload.firedAt, inline: true },
                  { name: "Message", value: payload.message, inline: false },
                  {
                     name: "Details",
                     value: `Status: ${payload.stats.statusCode ?? "n/a"} | Latency: ${payload.stats.latencyMs}ms | Consecutive failures: ${payload.stats.consecutiveFailures}`,
                     inline: false,
                  },
               ],
               timestamp: payload.firedAt,
            },
         ],
      };

      await postJson(webhookUrl, body);
      logger.info(`[UptimeDiscordChannel] Dispatched for monitor ${payload.monitor.id}`);
   }
}
