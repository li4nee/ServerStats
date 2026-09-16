import mongoConnection from "../../../../shared/infra/db/mongo/mongoConnection";
import postgresConnection from "../../../../shared/infra/db/postgres/postgresConnection";
import { MongoUptimeMonitorRepo } from "../../repos/uptimeMonitor.repo";
import { PgUptimeCheckRepo } from "../../repos/uptimeCheck.repo";
import { MongoUptimeAlertLogRepo } from "../../repos/uptimeAlertLog.repo";
import { UptimePingerService } from "../../services/uptimePinger.service";
import { UptimeAlertDispatcherService } from "../../services/uptimeAlertDispatcher.service";
import { UptimeAlertService } from "../../services/uptimeAlert.service";
import { UptimeWorker } from "../uptimeWorker";

export interface UptimeWorkerDependenciesType {
   worker: UptimeWorker;
}

export class UptimeWorkerDependenciesContainer {
   static init(): UptimeWorkerDependenciesType {
      const uptimeMonitorRepo = new MongoUptimeMonitorRepo();
      const uptimeCheckRepo = new PgUptimeCheckRepo();
      const uptimeAlertLogRepo = new MongoUptimeAlertLogRepo();

      const pinger = new UptimePingerService();
      const alertDispatcher = new UptimeAlertDispatcherService();
      const alertService = new UptimeAlertService(uptimeAlertLogRepo, uptimeMonitorRepo);

      const worker = new UptimeWorker({
         uptimeMonitorRepo,
         uptimeCheckRepo,
         pinger,
         alertDispatcher,
         alertService,
         mongoDBConnection: mongoConnection,
         postgresConnection: postgresConnection,
      });

      return { worker };
   }
}

export default UptimeWorkerDependenciesContainer;
