import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../../shared/middleware/authenticate.middleware";
import { authorize } from "../../../shared/middleware/authorize.middleware";
import { validateQuery } from "../../../shared/middleware/zodValidators.middleware";
import { USER_ROLE } from "../../../shared/typings/auth.typings";
import AnalyticsDependencyContainer from "../dependencies/analytics.dependency";
import { AnalyticsTimeRangeQueryDTO, AnalyticsTimeSeriesQueryDTO, EndpointDrilldownQueryDTO, RawLogsQueryDTO } from "../dtos/analyticsQuery.dto";

const router = Router();
const { analyticsController } = AnalyticsDependencyContainer.init().controllers;

/**
 * @route GET /api/v1/analytics/overview
 * @desc Get overview stats (total hits, errors, avg latency, unique endpoints) for a client
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/overview",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(AnalyticsTimeSeriesQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getOverview(req, res, next),
);

/**
 * @route GET /api/v1/analytics/top/hits
 * @desc Get top endpoints ranked by total hit count
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/top/hits",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(AnalyticsTimeRangeQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getTopEndpointsByHits(req, res, next),
);

/**
 * @route GET /api/v1/analytics/top/errors
 * @desc Get top endpoints ranked by error hit count
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/top/errors",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(AnalyticsTimeRangeQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getTopEndpointsByErrors(req, res, next),
);

/**
 * @route GET /api/v1/analytics/top/latency
 * @desc Get top endpoints ranked by average latency
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/top/latency",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(AnalyticsTimeRangeQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getTopEndpointsByLatency(req, res, next),
);

/**
 * @route GET /api/v1/analytics/timeseries
 * @desc Get hits, errors, and avg latency bucketed by hour over a time range
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/timeseries",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(AnalyticsTimeSeriesQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getTimeSeries(req, res, next),
);

/**
 * @route GET /api/v1/analytics/logs
 * @desc Get paginated raw API hit logs for a client with optional filters
 * @access Private (Super Admin, Client Admin, Client User with canViewRawLogs)
 */
router.get(
   "/logs",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(RawLogsQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getRawLogs(req, res, next),
);

/**
 * @route GET /api/v1/analytics/endpoint
 * @desc Get hourly time-series drilldown for a specific endpoint
 * @access Private (Super Admin, Client Admin, Client User with canViewAnalytics)
 */
router.get(
   "/endpoint",
   authenticate,
   authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.CLIENT_ADMIN, USER_ROLE.CLIENT_USER]),
   validateQuery(EndpointDrilldownQueryDTO),
   (req: Request, res: Response, next: NextFunction) => analyticsController.getEndpointDrilldown(req, res, next),
);

export default router;
