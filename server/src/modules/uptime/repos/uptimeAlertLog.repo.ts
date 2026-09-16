import { Types } from "mongoose";
import logger from "../../../shared/config/logger.config";
import { UptimeAlertLogDocument, UptimeAlertLogModel } from "../../../shared/infra/db/mongo/models/uptimeAlertLog.model";
import { UptimeAlertLogBaseRepo } from "./uptimeAlertLogBase.repo";

export class MongoUptimeAlertLogRepo extends UptimeAlertLogBaseRepo<UptimeAlertLogDocument> {
   private model = UptimeAlertLogModel;

   async create(data: Record<string, any>): Promise<UptimeAlertLogDocument> {
      try {
         const log = await this.model.create(data);
         logger.info(`[MongoUptimeAlertLogRepo] Alert log created for monitor: ${log.monitorId}`);
         return log;
      } catch (error) {
         logger.error("[MongoUptimeAlertLogRepo] Error creating alert log", { error, data });
         throw error;
      }
   }

   async findByMonitorId(
      monitorId: string,
      limit: number = 20,
      cursor?: string,
   ): Promise<{ data: UptimeAlertLogDocument[]; nextCursor?: string }> {
      try {
         const filter: Record<string, any> = { monitorId: new Types.ObjectId(monitorId) };

         if (cursor) {
            filter._id = { $lt: new Types.ObjectId(cursor) };
         }

         const safeLimit = Math.min(Math.max(limit, 1), 100);
         const items = await this.model
            .find(filter)
            .sort({ _id: -1 })
            .limit(safeLimit + 1);

         let nextCursor: string | undefined;
         let data: UptimeAlertLogDocument[];

         if (items.length > safeLimit) {
            nextCursor = items[safeLimit]._id.toString();
            data = items.slice(0, safeLimit);
         } else {
            data = items;
         }

         return { data, nextCursor };
      } catch (error) {
         logger.error(`[MongoUptimeAlertLogRepo] Error finding alert logs for monitorId: ${monitorId}`, { error });
         throw error;
      }
   }

   async deleteByMonitorId(monitorId: string): Promise<void> {
      try {
         await this.model.deleteMany({ monitorId: new Types.ObjectId(monitorId) });
         logger.info(`[MongoUptimeAlertLogRepo] Alert logs deleted for monitorId: ${monitorId}`);
      } catch (error) {
         logger.error(`[MongoUptimeAlertLogRepo] Error deleting alert logs for monitorId: ${monitorId}`, { error });
         throw error;
      }
   }
}
