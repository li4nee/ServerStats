import { EndpointMetrics } from "../../../shared/infra/db/postgres/postgresTypes";
import { EndPointMetricsBaseRepo } from "../../processor/repos/endpointMetricsBase.repo";
import { PgEndPointMetricsRepo } from "../../processor/repos/endpointMetrics.repo";
import { AnalyticsController } from "../controllers/analytics.controller";
import { IAnalyticsService } from "../contracts/IAnalyticsService.contract";
import { AnalyticsService } from "../services/analytics.service";

export interface AnalyticsDependencies {
   repositories: {
      endPointMetricsRepo: EndPointMetricsBaseRepo<EndpointMetrics>;
   };
   services: {
      analyticsService: IAnalyticsService;
   };
   controllers: {
      analyticsController: AnalyticsController;
   };
}

class AnalyticsDependencyContainer {
   static init(): AnalyticsDependencies {
      const repositories = {
         endPointMetricsRepo: new PgEndPointMetricsRepo(),
      };
      const services = {
         analyticsService: new AnalyticsService(repositories.endPointMetricsRepo),
      };
      const controllers = {
         analyticsController: new AnalyticsController(services.analyticsService),
      };
      return {
         repositories,
         services,
         controllers,
      };
   }
}

export { AnalyticsDependencyContainer };
export default AnalyticsDependencyContainer;
