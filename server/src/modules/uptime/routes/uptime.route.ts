import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../../shared/middleware/authenticate.middleware";
import { authorize } from "../../../shared/middleware/authorize.middleware";
import { validateBody, validateParams, validateQuery } from "../../../shared/middleware/zodValidators.middleware";
import { USER_ROLE } from "../../../shared/typings/auth.typings";
import UptimeDependencyContainer from "../dependencies/uptime.dependency";
import { CreateMonitorDTO } from "../dtos/createMonitor.dto";
import { UpdateMonitorDTO } from "../dtos/updateMonitor.dto";
import { HistoryQueryDTO, ListMonitorsQueryDTO, MonitorClientParamSchema } from "../dtos/listMonitors.dto";

const router = Router();
const { uptimeController } = UptimeDependencyContainer.init().controllers;

/**
 * @route POST /api/v1/uptime/:clientId
 * @desc Create a new uptime monitor for a client
 * @access Private (Super Admin, Client Admin with canManageSettings)
 */
router.post(
   "/:clientId",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN]),
   validateBody(CreateMonitorDTO),
   (req: Request, res: Response, next: NextFunction) => uptimeController.createMonitor(req, res, next),
);

/**
 * @route GET /api/v1/uptime
 * @desc List all uptime monitors for a client (paginated)
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(ListMonitorsQueryDTO),
   (req: Request, res: Response, next: NextFunction) => uptimeController.listMonitors(req, res, next),
);

/**
 * @route GET /api/v1/uptime/:clientId/:id/status
 * @desc Latest check + current uptime % over the default lookback window
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/:clientId/:id/status",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateParams(MonitorClientParamSchema),
   (req: Request, res: Response, next: NextFunction) => uptimeController.getStatus(req, res, next),
);

/**
 * @route GET /api/v1/uptime/:clientId/:id/history
 * @desc Check time series (query: startTime, endTime, bucket)
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/:clientId/:id/history",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateParams(MonitorClientParamSchema),
   validateQuery(HistoryQueryDTO),
   (req: Request, res: Response, next: NextFunction) => uptimeController.getHistory(req, res, next),
);

/**
 * @route GET /api/v1/uptime/:clientId/:id
 * @desc Get a single uptime monitor
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/:clientId/:id",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateParams(MonitorClientParamSchema),
   (req: Request, res: Response, next: NextFunction) => uptimeController.getMonitor(req, res, next),
);

/**
 * @route PATCH /api/v1/uptime/:clientId/:id
 * @desc Update an uptime monitor
 * @access Private (Super Admin, Client Admin with canManageSettings)
 */
router.patch(
   "/:clientId/:id",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN]),
   validateParams(MonitorClientParamSchema),
   validateBody(UpdateMonitorDTO),
   (req: Request, res: Response, next: NextFunction) => uptimeController.updateMonitor(req, res, next),
);

/**
 * @route DELETE /api/v1/uptime/:clientId/:id
 * @desc Delete an uptime monitor
 * @access Private (Super Admin, Client Admin with canManageSettings)
 */
router.delete(
   "/:clientId/:id",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN]),
   validateParams(MonitorClientParamSchema),
   (req: Request, res: Response, next: NextFunction) => uptimeController.deleteMonitor(req, res, next),
);

/**
 * @route PATCH /api/v1/uptime/:clientId/:id/enable
 * @desc Enable an uptime monitor
 * @access Private (Super Admin, Client Admin with canManageSettings)
 */
router.patch(
   "/:clientId/:id/enable",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN]),
   validateParams(MonitorClientParamSchema),
   (req: Request, res: Response, next: NextFunction) => uptimeController.setEnabled(req, res, next),
);

/**
 * @route PATCH /api/v1/uptime/:clientId/:id/disable
 * @desc Disable an uptime monitor
 * @access Private (Super Admin, Client Admin with canManageSettings)
 */
router.patch(
   "/:clientId/:id/disable",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN]),
   validateParams(MonitorClientParamSchema),
   (req: Request, res: Response, next: NextFunction) => uptimeController.setEnabled(req, res, next),
);

export default router;
