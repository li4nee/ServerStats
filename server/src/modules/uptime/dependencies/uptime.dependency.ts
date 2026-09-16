import { UptimeMonitorDocument } from "../../../shared/infra/db/mongo/models/uptimeMonitor.model";
import { UptimeAlertLogDocument } from "../../../shared/infra/db/mongo/models/uptimeAlertLog.model";
import { UptimeMonitorBaseRepo } from "../repos/uptimeMonitorBase.repo";
import { MongoUptimeMonitorRepo } from "../repos/uptimeMonitor.repo";
import { UptimeCheckBaseRepo } from "../repos/uptimeCheckBase.repo";
import { PgUptimeCheckRepo } from "../repos/uptimeCheck.repo";
import { UptimeAlertLogBaseRepo } from "../repos/uptimeAlertLogBase.repo";
import { MongoUptimeAlertLogRepo } from "../repos/uptimeAlertLog.repo";
import { UptimeController } from "../controllers/uptime.controller";
import { IUptimeService } from "../contracts/IUptimeService.contract";
import { UptimeService } from "../services/uptime.service";

export interface UptimeDependencies {
   repositories: {
      uptimeMonitorRepo: UptimeMonitorBaseRepo<UptimeMonitorDocument>;
      uptimeCheckRepo: UptimeCheckBaseRepo;
      uptimeAlertLogRepo: UptimeAlertLogBaseRepo<UptimeAlertLogDocument>;
   };
   services: {
      uptimeService: IUptimeService;
   };
   controllers: {
      uptimeController: UptimeController;
   };
}

class UptimeDependencyContainer {
   static init(): UptimeDependencies {
      const repositories = {
         uptimeMonitorRepo: new MongoUptimeMonitorRepo(),
         uptimeCheckRepo: new PgUptimeCheckRepo(),
         uptimeAlertLogRepo: new MongoUptimeAlertLogRepo(),
      };
      const services = {
         uptimeService: new UptimeService(repositories.uptimeMonitorRepo, repositories.uptimeCheckRepo, repositories.uptimeAlertLogRepo),
      };
      const controllers = {
         uptimeController: new UptimeController(services.uptimeService),
      };
      return {
         repositories,
         services,
         controllers,
      };
   }
}

export { UptimeDependencyContainer };
export default UptimeDependencyContainer;
