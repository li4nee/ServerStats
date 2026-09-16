import { z } from "zod";

export const ListMonitorsQueryDTO = z.object({
   clientId: z.string().min(1, "clientId is required"),
   limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => val >= 1 && val <= 100, { message: "limit must be between 1 and 100" }),
   cursor: z.string().optional(),
});

export type ListMonitorsQueryDTOType = z.infer<typeof ListMonitorsQueryDTO>;

export const HistoryQueryDTO = z.object({
   startTime: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
   endTime: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
   bucket: z.enum(["minute", "hour", "day"] as const).optional(),
});

export type HistoryQueryDTOType = z.infer<typeof HistoryQueryDTO>;

export const MonitorIdParamSchema = z.object({
   id: z.string().min(1, "Monitor ID is required"),
});

export const MonitorClientParamSchema = z.object({
   clientId: z.string().min(1, "clientId is required"),
   id: z.string().min(1, "Monitor ID is required"),
});
