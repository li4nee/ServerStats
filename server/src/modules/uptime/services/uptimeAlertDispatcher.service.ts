import logger from "../../../shared/config/logger.config";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { IUptimeAlertChannel, UptimeDispatchPayload } from "./channels/uptimeAlertChannel.interface";
import { UptimeWebhookChannel } from "./channels/uptimeWebhook.channel";
import { UptimeSlackChannel } from "./channels/uptimeSlack.channel";
import { UptimeDiscordChannel } from "./channels/uptimeDiscord.channel";
import { UptimeEmailChannel } from "./channels/uptimeEmail.channel";

export interface UptimeFireContext {
   reason: UptimeDispatchPayload["reason"];
   message: string;
   stats: UptimeDispatchPayload["stats"];
}

export class UptimeAlertDispatcherService {
   private channels: Map<string, IUptimeAlertChannel>;

   constructor() {
      const channelList: IUptimeAlertChannel[] = [
         new UptimeWebhookChannel(),
         new UptimeSlackChannel(),
         new UptimeDiscordChannel(),
         new UptimeEmailChannel(),
      ];
      this.channels = new Map(channelList.map((c) => [c.type, c]));
   }

   async dispatch(monitor: UptimeMonitorDocument, context: UptimeFireContext): Promise<string[]> {
      const payload: UptimeDispatchPayload = {
         monitor: {
            id: monitor._id.toString(),
            name: monitor.name,
            targetUrl: monitor.targetUrl,
            clientId: monitor.clientId.toString(),
         },
         reason: context.reason,
         message: context.message,
         firedAt: new Date().toISOString(),
         stats: context.stats,
      };

      const notified: string[] = [];

      for (const channel of monitor.channels ?? []) {
         const type = channel.type as string;
         const handler = this.channels.get(type);

         if (!handler) {
            logger.warn(`[UptimeAlertDispatcherService] Channel type '${type}' is not implemented. Skipping.`);
            continue;
         }

         try {
            await handler.dispatch(channel.config as Record<string, unknown>, payload);
            notified.push(type);
         } catch (error) {
            logger.error(`[UptimeAlertDispatcherService] Failed to dispatch via ${type} for monitor ${monitor._id}`, { error });
         }
      }

      return notified;
   }
}
