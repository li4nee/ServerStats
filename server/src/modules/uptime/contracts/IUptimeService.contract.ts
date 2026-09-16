import { UserInsideAuthorizedRequest } from "../../../shared/typings/auth.typings";
import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { UptimeAlertLogDocument } from "../../../shared/infra/db/mongo/models/uptimeAlertLog.model";
import { UptimeSummary, UptimeTimeSeriesBucket } from "../repos/uptimeCheckBase.repo";
import { CreateMonitorDTOType } from "../dtos/createMonitor.dto";
import { UpdateMonitorDTOType } from "../dtos/updateMonitor.dto";
import { AlertLogQueryDTOType, HistoryQueryDTOType, ListMonitorsQueryDTOType } from "../dtos/listMonitors.dto";

export interface MonitorStatus {
   monitor: UptimeMonitorDocument;
   summary: UptimeSummary;
}

export interface IUptimeService {
   createMonitor(user: UserInsideAuthorizedRequest, clientId: string, data: CreateMonitorDTOType): Promise<UptimeMonitorDocument>;
   listMonitors(
      user: UserInsideAuthorizedRequest,
      query: ListMonitorsQueryDTOType,
   ): Promise<{ data: UptimeMonitorDocument[]; nextCursor?: string }>;
   getMonitor(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<UptimeMonitorDocument>;
   updateMonitor(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      data: UpdateMonitorDTOType,
   ): Promise<UptimeMonitorDocument>;
   deleteMonitor(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<void>;
   setEnabled(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      isEnabled: boolean,
   ): Promise<UptimeMonitorDocument>;
   getStatus(user: UserInsideAuthorizedRequest, clientId: string, monitorId: string): Promise<MonitorStatus>;
   getHistory(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      query: HistoryQueryDTOType,
   ): Promise<UptimeTimeSeriesBucket[]>;
   getAlertHistory(
      user: UserInsideAuthorizedRequest,
      clientId: string,
      monitorId: string,
      query: AlertLogQueryDTOType,
   ): Promise<{ data: UptimeAlertLogDocument[]; nextCursor?: string }>;
}
