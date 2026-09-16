import type { Response, NextFunction } from "express";
import { AuthorizedRequest } from "../../../shared/typings/auth.typings";
import { ResourceNotInitializedError } from "../../../shared/typings/error.typings";
import { ResponseFormatter } from "../../../shared/utils/responseFormatter.utils";
import { IUptimeService } from "../contracts/IUptimeService.contract";
import { CreateMonitorDTOType } from "../dtos/createMonitor.dto";
import { UpdateMonitorDTOType } from "../dtos/updateMonitor.dto";
import { AlertLogQueryDTOType, HistoryQueryDTOType, ListMonitorsQueryDTOType } from "../dtos/listMonitors.dto";

export class UptimeController {
   protected uptimeService: IUptimeService;

   constructor(uptimeService: IUptimeService) {
      if (!uptimeService) {
         throw new ResourceNotInitializedError("[UptimeController] UptimeService must be provided to UptimeController");
      }
      this.uptimeService = uptimeService;
   }

   /**
    * POST /api/v1/uptime/:clientId
    */
   async createMonitor(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId } = req.params as { clientId: string };
         const body = req.body as CreateMonitorDTOType;
         const monitor = await this.uptimeService.createMonitor(req.user!, clientId, body);
         return res.status(201).json(ResponseFormatter.success("Uptime monitor created successfully.", 201, { monitor }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/v1/uptime?clientId=&limit=&cursor=
    */
   async listMonitors(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const query = req.query as unknown as ListMonitorsQueryDTOType;
         const result = await this.uptimeService.listMonitors(req.user!, query);
         return res.status(200).json(ResponseFormatter.success("Uptime monitors retrieved successfully.", 200, result));
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/v1/uptime/:clientId/:id
    */
   async getMonitor(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const monitor = await this.uptimeService.getMonitor(req.user!, clientId, id);
         return res.status(200).json(ResponseFormatter.success("Uptime monitor retrieved successfully.", 200, { monitor }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * PATCH /api/v1/uptime/:clientId/:id
    */
   async updateMonitor(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const body = req.body as UpdateMonitorDTOType;
         const monitor = await this.uptimeService.updateMonitor(req.user!, clientId, id, body);
         return res.status(200).json(ResponseFormatter.success("Uptime monitor updated successfully.", 200, { monitor }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * DELETE /api/v1/uptime/:clientId/:id
    */
   async deleteMonitor(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         await this.uptimeService.deleteMonitor(req.user!, clientId, id);
         return res.status(200).json(ResponseFormatter.success("Uptime monitor deleted successfully.", 200, null));
      } catch (error) {
         next(error);
      }
   }

   /**
    * PATCH /api/v1/uptime/:clientId/:id/enable
    * PATCH /api/v1/uptime/:clientId/:id/disable
    */
   async setEnabled(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const isEnabled = req.path.endsWith("/enable");
         const monitor = await this.uptimeService.setEnabled(req.user!, clientId, id, isEnabled);
         const msg = isEnabled ? "Uptime monitor enabled successfully." : "Uptime monitor disabled successfully.";
         return res.status(200).json(ResponseFormatter.success(msg, 200, { monitor }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/v1/uptime/:clientId/:id/status
    */
   async getStatus(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const result = await this.uptimeService.getStatus(req.user!, clientId, id);
         return res.status(200).json(ResponseFormatter.success("Uptime monitor status retrieved successfully.", 200, result));
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/v1/uptime/:clientId/:id/history
    */
   async getHistory(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const query = req.query as unknown as HistoryQueryDTOType;
         const data = await this.uptimeService.getHistory(req.user!, clientId, id, query);
         return res.status(200).json(ResponseFormatter.success("Uptime monitor history retrieved successfully.", 200, { data }));
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/v1/uptime/:clientId/:id/alerts
    */
   async getAlerts(req: AuthorizedRequest, res: Response, next: NextFunction) {
      try {
         const { clientId, id } = req.params as { clientId: string; id: string };
         const query = req.query as unknown as AlertLogQueryDTOType;
         const result = await this.uptimeService.getAlertHistory(req.user!, clientId, id, query);
         return res.status(200).json(ResponseFormatter.success("Uptime alert history retrieved successfully.", 200, result));
      } catch (error) {
         next(error);
      }
   }
}
