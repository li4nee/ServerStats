import { z } from "zod";

export const AnalyticsTimeRangeQueryDTO = z.object({
   clientId: z.string().min(1, "clientId is required"),
   startTime: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .refine((val) => val === undefined || !isNaN(val!.getTime()), { message: "startTime must be a valid ISO date string" }),
   endTime: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .refine((val) => val === undefined || !isNaN(val!.getTime()), { message: "endTime must be a valid ISO date string" }),
   limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val >= 1 && val <= 100, { message: "limit must be between 1 and 100" }),
});

export type AnalyticsTimeRangeQueryDTOType = z.infer<typeof AnalyticsTimeRangeQueryDTO>;

export const AnalyticsTimeSeriesQueryDTO = z.object({
   clientId: z.string().min(1, "clientId is required"),
   serviceName: z.string().optional(),
   startTime: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .refine((val) => val === undefined || !isNaN(val!.getTime()), { message: "startTime must be a valid ISO date string" }),
   endTime: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .refine((val) => val === undefined || !isNaN(val!.getTime()), { message: "endTime must be a valid ISO date string" }),
});

export type AnalyticsTimeSeriesQueryDTOType = z.infer<typeof AnalyticsTimeSeriesQueryDTO>;
