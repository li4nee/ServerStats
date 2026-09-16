import mongoose, { HydratedDocument, InferSchemaType } from "mongoose";

const uptimeMonitorSchema = new mongoose.Schema(
   {
      clientId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Client",
         required: true,
         index: true,
      },

      name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 100,
      },

      targetUrl: {
         type: String,
         required: true,
      },

      httpMethod: {
         type: String,
         enum: ["GET", "HEAD", "POST"],
         default: "GET",
      },

      intervalMs: {
         type: Number,
         default: 60000,
      },

      timeoutMs: {
         type: Number,
         default: 5000,
      },

      expectedStatusCodes: {
         type: [Number],
         default: [200],
      },

      isEnabled: {
         type: Boolean,
         default: true,
      },

      lastCheckedAt: {
         type: Date,
         default: null,
      },

      lastStatus: {
         type: String,
         enum: ["up", "down", "unknown"],
         default: "unknown",
      },

      // Resets to 0 on any successful check; drives down-detection via alertConditions.consecutiveFailuresThreshold.
      consecutiveFailures: {
         type: Number,
         default: 0,
      },

      channels: [
         {
            type: {
               type: String,
               enum: ["email", "webhook", "slack", "discord", "sms"],
               required: true,
            },
            config: {
               type: mongoose.Schema.Types.Mixed,
               required: true,
            },
         },
      ],

      // All fields optional — caller decides which conditions to enable. Unset
      // fields fall back to defaults (threshold, cooldown) or are simply off
      // (notifyOnRecovery, responseTimeThresholdMs).
      alertConditions: {
         type: mongoose.Schema.Types.Mixed,
      },

      lastAlertedAt: {
         type: Date,
         default: null,
      },

      createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
   },
   {
      timestamps: true,
      collection: "uptimeMonitors",
   },
);

uptimeMonitorSchema.index({ clientId: 1, isEnabled: 1 });

export type UptimeMonitor = InferSchemaType<typeof uptimeMonitorSchema>;
export type UptimeMonitorDocument = HydratedDocument<UptimeMonitor>;
export const UptimeMonitorModel = mongoose.model("UptimeMonitor", uptimeMonitorSchema);
