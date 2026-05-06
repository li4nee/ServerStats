import { z } from "zod";
import { HTTP_METHODS } from "../../../shared/typings/auth.typings";
import { EventType } from "../../../shared/typings/messaging.typings";

export const EventDataTypeSchema = z.object({
   eventId: z.string(),
   timeStamp: z.string(),
   serviceName: z.string(),
   endpoint: z.string(),
   method: z.nativeEnum(HTTP_METHODS),
   statusCode: z.number(),
   latencyMs: z.number(),
   clientId: z.string(),
   apiKeyId: z.string(),
   ipInIpV4: z.string().optional(),
   ipInIpV6: z.string().optional(),
   userAgent: z.string().optional(),
});

export const PublishingEventDataTypeSchema = z.object({
   eventData: EventDataTypeSchema,
   messageId: z.string(),
   correlationId: z.string(),
   timeStamp: z.string(),
   eventType: z.enum(EventType),
   attempts: z.number().optional(),
});

export type EventDataDTOType = z.infer<typeof EventDataTypeSchema>;
export type PublishingEventDataDTOType = z.infer<typeof PublishingEventDataTypeSchema>;

export type ParsedMessageType = {
   eventData: EventDataDTOType;
   messageId: string;
   retryCount: number;
   eventType: EventType;
};
