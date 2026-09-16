import { z } from "zod";

const ChannelConfigSchema = z.object({
   type: z.enum(["email", "webhook", "slack", "discord", "sms"] as const),
   config: z.record(z.string(), z.unknown()),
});

// All optional — caller decides which alert conditions to enable. Unset fields
// default sensibly (threshold, cooldown) or are simply off (see uptimeAlert.service.ts).
export const AlertConditionsSchema = z.object({
   consecutiveFailuresThreshold: z.number().int().min(1).max(10).optional(),
   cooldownMinutes: z.number().int().min(1).optional(),
   notifyOnRecovery: z.boolean().optional(),
   responseTimeThresholdMs: z.number().int().min(1).optional(),
});

export const CreateMonitorDTO = z.object({
   name: z.string().min(1).max(100),
   targetUrl: z.string().url(),
   httpMethod: z.enum(["GET", "HEAD", "POST"] as const).optional(),
   intervalMs: z.number().int().min(60000).max(300000).optional(),
   timeoutMs: z.number().int().min(1000).max(30000).optional(),
   expectedStatusCodes: z.array(z.number().int().min(100).max(599)).min(1).optional(),
   channels: z.array(ChannelConfigSchema).optional(),
   alertConditions: AlertConditionsSchema.optional(),
});

export type CreateMonitorDTOType = z.infer<typeof CreateMonitorDTO>;
export type AlertConditionsType = z.infer<typeof AlertConditionsSchema>;
