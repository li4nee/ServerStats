import mongoConnection from "../../../../shared/infra/db/mongo/mongoConnection";
import postgresConnection from "../../../../shared/infra/db/postgres/postgresConnection";
import { MongoUptimeMonitorRepo } from "../../repos/uptimeMonitor.repo";
import { PgUptimeCheckRepo } from "../../repos/uptimeCheck.repo";
import { UptimePingerService } from "../../services/uptimePinger.service";
import { UptimeWorker } from "../uptimeWorker";

export interface UptimeWorkerDependenciesType {
   worker: UptimeWorker;
}

export class UptimeWorkerDependenciesContainer {
   static init(): UptimeWorkerDependenciesType {
      const uptimeMonitorRepo = new MongoUptimeMonitorRepo();
      const uptimeCheckRepo = new PgUptimeCheckRepo();
      const pinger = new UptimePingerService();

      const worker = new UptimeWorker({
         uptimeMonitorRepo,
         uptimeCheckRepo,
         pinger,
         mongoDBConnection: mongoConnection,
         postgresConnection: postgresConnection,
      });

      return { worker };
   }
}

export default UptimeWorkerDependenciesContainer;
