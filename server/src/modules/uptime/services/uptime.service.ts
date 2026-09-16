import { Types } from "mongoose";
import logger from "../../../shared/config/logger.config";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { USER_ROLE, UserInsideAuthorizedRequest } from "../../../shared/typings/auth.typings";
import { PermissionNotGranted, ResourceNotFoundError, ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { UptimeMonitorBaseRepo } from "../repos/uptimeMonitorBase.repo";
import { UptimeCheckBaseRepo } from "../repos/uptimeCheckBase.repo";
import { UptimeAlertLogBaseRepo } from "../repos/uptimeAlertLogBase.repo";
import { UptimeAlertLogDocument } from "../../../shared/infra/db/mongo/models/uptimeAlertLog.model";
import { IUptimeService, MonitorStatus } from "../contracts/IUptimeService.contract";
import { CreateMonitorDTOType } from "../dtos/createMonitor.dto";
import { UpdateMonitorDTOType } from "../dtos/updateMonitor.dto";
import { AlertLogQueryDTOType, HistoryQueryDTOType, ListMonitorsQueryDTOType } from "../dtos/listMonitors.dto";
import { AuditLogger } from "../../../shared/utils/auditLogger.utils";

export class UptimeService implements IUptimeService {
   private uptimeMonitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>;
   private uptimeCheckRepo: UptimeCheckBaseRepo;
   private uptimeAlertLogRepo: UptimeAlertLogBaseRepo<UptimeAlertLogDocument>;

   constructor(
      uptimeMonitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>,
      uptimeCheckRepo: UptimeCheckBaseRepo,
      uptimeAlertLogRepo: UptimeAlertLogBaseRepo<UptimeAlertLogDocument>,
   ) {
      if (!uptimeMonitorRepo || !uptimeCheckRepo || !uptimeAlertLogRepo) {
         throw new ResourceNotInitializedError("[UptimeService] All repositories must be provided to UptimeService");
      }
      this.uptimeMonitorRepo = uptimeMonitorRepo;
      this.uptimeCheckRepo = uptimeCheckRepo;
      this.uptimeAlertLogRepo = uptimeAlertLogRepo;
   }

   private checkClientAccess(user: UserInsideAuthorizedRequest, targetClientId: string): void {
      if (user.role === USER_ROLE.SUPER_ADMIN) return;

      if (!user.clientId || user.clientId !== targetClientId) {
         throw new PermissionNotGranted("You are not authorized to manage uptime monitors for this client.");
      }
   }

   private checkManagePermission(user: UserInsideAuthorizedRequest, targetClientId: string): void {
      this.checkClientAccess(user, targetClientId);
      if (user.role !== USER_ROLE.SUPER_ADMIN && !user.permissions.canManageSettings) {
         throw new PermissionNotGranted("You do not have permission to manage uptime monitor settings.");
      }
   }

   private checkViewPermission(user: UserInsideAuthorizedRequest, targetClientId: string): void {
      this.checkClientAccess(user, targetClientId);
      if (user.role !== USER_ROLE.SUPER_ADMIN && !user.permissions.canViewAnalytics) {
         throw new PermissionNotGranted("You do not have permission to view uptime monitors.");
      }
   }

   private async getOwnedMonitor(clientId: string, monitorId: string): Promise<UptimeMonitorDocument> {
      const monitor = await this.uptimeMonitorRepo.findById(monitorId);
      if (!monitor) throw new ResourceNotFoundError("Uptime monitor not found.");
      if (monitor.clientId.toString() !== clientId) {
         throw new PermissionNotGranted("You are not authorized to access this uptime monitor.");
      }
      return monitor;
   }

   async createMonitor(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      data: CreateMonitorDTOType,
   ): Promise<UptimeMonitorDocument> {
      try {
         this.checkManagePermission(user, clientId);
         const monitor = await this.uptimeMonitorRepo.create({
            ...data,
            clientId: new Types.ObjectId(clientId),
            createdBy: new Types.ObjectId(user.id),
            isEnabled: true,
         });
         logger.info(`[UptimeService] Monitor created: ${monitor._id} for clientId: ${clientId} by user: ${user.id}`);
         AuditLogger.log({
            action: "uptime_monitor.created",
            actorId: user.id,
            actorRole: user.role,
            clientId,
            targetType: "uptime_monitor",
            targetId: monitor._id?.toString(),
            metadata: { name: monitor.name, targetUrl: monitor.targetUrl },
         });
         return monitor;
      } catch (error) {
         logger.error("[UptimeService] Error creating monitor", { error, clientId });
         throw error;
      }
   }

   async listMonitors(
      user: UserInsideAuthorizedRequest,
      query: ListMonitorsQueryDTOType,
   ): Promise<{ data: UptimeMonitorDocument[]; nextCursor?: string }> {
      try {
         this.checkViewPermission(user, query.clientId);
         return await this.uptimeMonitorRepo.findByClientId(query.clientId, query.limit, query.cursor);
      } catch (error) {
         logger.error("[UptimeService] Error listing monitors", { error, query });
         throw error;
      }
   }

   async getMonitor(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<UptimeMonitorDocument> {
      try {
         this.checkViewPermission(user, clientId);
         return await this.getOwnedMonitor(clientId, monitorId);
      } catch (error) {
         logger.error("[UptimeService] Error getting monitor", { error, clientId, monitorId });
         throw error;
      }
   }

   async updateMonitor(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      data: UpdateMonitorDTOType,
   ): Promise<UptimeMonitorDocument> {
      try {
         this.checkManagePermission(user, clientId);
         await this.getOwnedMonitor(clientId, monitorId);
         const updated = await this.uptimeMonitorRepo.update(monitorId, data);
         if (!updated) throw new ResourceNotFoundError("Uptime monitor not found.");
         logger.info(`[UptimeService] Monitor updated: ${monitorId} by user: ${user.id}`);
         AuditLogger.log({
            action: "uptime_monitor.updated",
            actorId: user.id,
            actorRole: user.role,
            clientId,
            targetType: "uptime_monitor",
            targetId: monitorId,
            metadata: { fields: Object.keys(data) },
         });
         return updated;
      } catch (error) {
         logger.error("[UptimeService] Error updating monitor", { error, clientId, monitorId });
         throw error;
      }
   }

   async deleteMonitor(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<void> {
      try {
         this.checkManagePermission(user, clientId);
         const existing = await this.getOwnedMonitor(clientId, monitorId);
         await this.uptimeMonitorRepo.delete(monitorId);
         await this.uptimeAlertLogRepo.deleteByMonitorId(monitorId);
         logger.info(`[UptimeService] Monitor deleted: ${monitorId} by user: ${user.id}`);
         AuditLogger.log({
            action: "uptime_monitor.deleted",
            actorId: user.id,
            actorRole: user.role,
            clientId,
            targetType: "uptime_monitor",
            targetId: monitorId,
            metadata: { name: existing.name },
         });
      } catch (error) {
         logger.error("[UptimeService] Error deleting monitor", { error, clientId, monitorId });
         throw error;
      }
   }

   async setEnabled(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      isEnabled: boolean,
   ): Promise<UptimeMonitorDocument> {
      try {
         this.checkManagePermission(user, clientId);
         await this.getOwnedMonitor(clientId, monitorId);
         const updated = await this.uptimeMonitorRepo.setEnabled(monitorId, isEnabled);
         if (!updated) throw new ResourceNotFoundError("Uptime monitor not found.");
         logger.info(`[UptimeService] Monitor ${monitorId} ${isEnabled ? "enabled" : "disabled"} by user: ${user.id}`);
         AuditLogger.log({
            action: isEnabled ? "uptime_monitor.enabled" : "uptime_monitor.disabled",
            actorId: user.id,
            actorRole: user.role,
            clientId,
            targetType: "uptime_monitor",
            targetId: monitorId,
         });
         return updated;
      } catch (error) {
         logger.error("[UptimeService] Error setting monitor enabled status", { error, clientId, monitorId, isEnabled });
         throw error;
      }
   }

   async getStatus(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<MonitorStatus> {
      try {
         this.checkViewPermission(user, clientId);
         const monitor = await this.getOwnedMonitor(clientId, monitorId);
         const summary = await this.uptimeCheckRepo.getUptimeSummary(monitorId);
         return { monitor, summary };
      } catch (error) {
         logger.error("[UptimeService] Error getting monitor status", { error, clientId, monitorId });
         throw error;
      }
   }

   async getHistory(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string, query: HistoryQueryDTOType) {
      try {
         this.checkViewPermission(user, clientId);
         await this.getOwnedMonitor(clientId, monitorId);
         return await this.uptimeCheckRepo.getTimeSeries(monitorId, query.startTime, query.endTime, query.bucket);
      } catch (error) {
         logger.error("[UptimeService] Error getting monitor history", { error, clientId, monitorId });
         throw error;
      }
   }

   async getAlertHistory(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string, query: AlertLogQueryDTOType) {
      try {
         this.checkViewPermission(user, clientId);
         await this.getOwnedMonitor(clientId, monitorId);
         return await this.uptimeAlertLogRepo.findByMonitorId(monitorId, query.limit, query.cursor);
      } catch (error) {
         logger.error("[UptimeService] Error getting monitor alert history", { error, clientId, monitorId });
         throw error;
      }
   }
}
