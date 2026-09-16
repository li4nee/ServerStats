import logger from "../../../../shared/config/logger.config";
import { IUptimeAlertChannel, UptimeDispatchPayload } from "./uptimeAlertChannel.interface";
import { postJson } from "./httpPost.util";

export class UptimeWebhookChannel implements IUptimeAlertChannel {
   readonly type = "webhook";

   async dispatch(config: Record<string, unknown>, payload: UptimeDispatchPayload): Promise<void> {
      const url = config.url as string;
      if (!url) {
         logger.warn("[UptimeWebhookChannel] Missing 'url' in config. Skipping.");
         return;
      }
      await postJson(url, payload);
      logger.info(`[UptimeWebhookChannel] Dispatched to ${url} for monitor ${payload.monitor.id}`);
   }
}
