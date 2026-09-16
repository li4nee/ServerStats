import { z } from "zod";
import { AlertConditionsSchema } from "./createMonitor.dto";

const ChannelConfigSchema = z.object({
   type: z.enum(["email", "webhook", "slack", "discord", "sms"] as const),
   config: z.record(z.string(), z.unknown()),
});

export const UpdateMonitorDTO = z.object({
   name: z.string().min(1).max(100).optional(),
   targetUrl: z.string().url().optional(),
   httpMethod: z.enum(["GET", "HEAD", "POST"] as const).optional(),
   intervalMs: z.number().int().min(60000).max(300000).optional(),
   timeoutMs: z.number().int().min(1000).max(30000).optional(),
   expectedStatusCodes: z.array(z.number().int().min(100).max(599)).min(1).optional(),
   channels: z.array(ChannelConfigSchema).optional(),
   alertConditions: AlertConditionsSchema.optional(),
});

export type UpdateMonitorDTOType = z.infer<typeof UpdateMonitorDTO>;
