import { Types } from "mongoose";
import logger from "../../../shared/config/logger.config";
import { UptimeMonitorDocument, UptimeMonitorModel } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { UptimeMonitorBaseRepo } from "./uptimeMonitorBase.repo";

export class MongoUptimeMonitorRepo extends UptimeMonitorBaseRepo<UptimeMonitorDocument> {
   private model = UptimeMonitorModel;

   /** Shared cursor-pagination for any filter, fetching one extra doc to detect nextCursor. */
   private async paginate(
      filter: Record<string, any>,
      limit: number,
      cursor?: string,
   ): Promise<{ data: UptimeMonitorDocument[]; nextCursor?: string }> {
      if (cursor) {
         filter._id = { $lt: new Types.ObjectId(cursor) };
      }

      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const items = await this.model
         .find(filter)
         .sort({ _id: -1 })
         .limit(safeLimit + 1)
         .select("-__v");

      if (items.length > safeLimit) {
         return { data: items.slice(0, safeLimit), nextCursor: items[safeLimit]._id.toString() };
      }
      return { data: items };
   }

   async create(data: Record<string, any>): Promise<UptimeMonitorDocument> {
      try {
         const monitor = await this.model.create(data);
         logger.info(`[MongoUptimeMonitorRepo] Monitor created: ${monitor._id}`);
         return monitor;
      } catch (error) {
         logger.error("[MongoUptimeMonitorRepo] Error creating monitor", { error, data });
         throw error;
      }
   }

   async findById(id: string): Promise<UptimeMonitorDocument | null> {
      try {
         return await this.model.findById(id).select("-__v");
      } catch (error) {
         logger.error(`[MongoUptimeMonitorRepo] Error finding monitor by id: ${id}`, { error });
         throw error;
      }
   }

   async findByClientId(
      clientId: string,
      limit: number = 20,
      cursor?: string,
   ): Promise<{ data: UptimeMonitorDocument[]; nextCursor?: string }> {
      try {
         return await this.paginate({ clientId: new Types.ObjectId(clientId) }, limit, cursor);
      } catch (error) {
         logger.error(`[MongoUptimeMonitorRepo] Error finding monitors for clientId: ${clientId}`, { error });
         throw error;
      }
   }

   async findEnabled(limit: number = 100, cursor?: string): Promise<{ data: UptimeMonitorDocument[]; nextCursor?: string }> {
      try {
         return await this.paginate({ isEnabled: true }, limit, cursor);
      } catch (error) {
         logger.error("[MongoUptimeMonitorRepo] Error finding enabled monitors", { error });
         throw error;
      }
   }

   async update(id: string, data: Record<string, any>): Promise<UptimeMonitorDocument | null> {
      try {
         const updated = await this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).select("-__v");
         if (!updated) logger.warn(`[MongoUptimeMonitorRepo] Monitor not found for update: ${id}`);
         return updated;
      } catch (error) {
         logger.error(`[MongoUptimeMonitorRepo] Error updating monitor: ${id}`, { error, data });
         throw error;
      }
   }

   async delete(id: string): Promise<void> {
      try {
         await this.model.findByIdAndDelete(id);
         logger.info(`[MongoUptimeMonitorRepo] Monitor deleted: ${id}`);
      } catch (error) {
         logger.error(`[MongoUptimeMonitorRepo] Error deleting monitor: ${id}`, { error });
         throw error;
      }
   }

   async setEnabled(id: string, isEnabled: boolean): Promise<UptimeMonitorDocument | null> {
      try {
         const updated = await this.model.findByIdAndUpdate(id, { $set: { isEnabled } }, { new: true }).select("-__v");
         if (!updated) logger.warn(`[MongoUptimeMonitorRepo] Monitor not found for enable/disable: ${id}`);
         return updated;
      } catch (error) {
         logger.error(`[MongoUptimeMonitorRepo] Error setting enabled status for monitor: ${id}`, { error });
         throw error;
      }
   }
}
