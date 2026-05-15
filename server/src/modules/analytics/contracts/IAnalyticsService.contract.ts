import { UserInsideAuthorizedRequest } from "../../../shared/typings/auth.typings";
import { AnalyticsTimeRangeQueryDTOType, AnalyticsTimeSeriesQueryDTOType } from "../dtos/analyticsQuery.dto";
import { EndpointSummary, OverviewStats, TimeSeriesBucket } from "../dtos/analyticsResponse.dto";

export interface IAnalyticsService {
   getOverview(user: UserInsideAuthorizedRequest, clientId: string, startTime?: Date, endTime?: Date): Promise<OverviewStats>;
   getTopEndpointsByHits(user: UserInsideAuthorizedRequest, query: AnalyticsTimeRangeQueryDTOType): Promise<EndpointSummary[]>;
   getTopEndpointsByErrors(user: UserInsideAuthorizedRequest, query: AnalyticsTimeRangeQueryDTOType): Promise<EndpointSummary[]>;
   getTopEndpointsByLatency(user: UserInsideAuthorizedRequest, query: AnalyticsTimeRangeQueryDTOType): Promise<EndpointSummary[]>;
   getTimeSeries(user: UserInsideAuthorizedRequest, query: AnalyticsTimeSeriesQueryDTOType): Promise<TimeSeriesBucket[]>;
}
