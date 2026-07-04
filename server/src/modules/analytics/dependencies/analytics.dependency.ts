import { EndpointMetrics } from "../../../shared/infra/db/postgres/postgresTypes";
import { ApiHitsWithId } from "../../../shared/infra/db/mongo/models/apiHits.model";
import { ApiHitsBaseRepo } from "../../processor/repos/apiHitsBase.repo";
import { MongoApiHitsRepo } from "../../processor/repos/apiHits.repo";
import { EndPointMetricsBaseRepo } from "../../processor/repos/endpointMetricsBase.repo";
import { PgEndPointMetricsRepo } from "../../processor/repos/endpointMetrics.repo";
import { AnalyticsController } from "../controllers/analytics.controller";
import { IAnalyticsService } from "../contracts/IAnalyticsService.contract";
import { AnalyticsService } from "../services/analytics.service";

export interface AnalyticsDependencies {
   repositories: {
      endPointMetricsRepo: EndPointMetricsBaseRepo<EndpointMetrics>;
      apiHitsRepo: ApiHitsBaseRepo<ApiHitsWithId>;
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
         apiHitsRepo: new MongoApiHitsRepo(),
      };
      const services = {
         analyticsService: new AnalyticsService(repositories.endPointMetricsRepo, repositories.apiHitsRepo),
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
