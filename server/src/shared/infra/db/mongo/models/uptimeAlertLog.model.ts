import mongoose, { HydratedDocument, InferSchemaType } from "mongoose";

const uptimeAlertLogSchema = new mongoose.Schema(
   {
      monitorId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "UptimeMonitor",
         required: true,
         index: true,
      },

      clientId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Client",
         required: true,
         index: true,
      },

      firedAt: {
         type: Date,
         required: true,
         default: () => new Date(),
      },

      reason: {
         type: String,
         enum: ["down", "slow_response", "recovery"],
         required: true,
      },

      message: {
         type: String,
         required: true,
      },

      stats: {
         type: mongoose.Schema.Types.Mixed,
         required: true,
      },

      channelsNotified: {
         type: [String],
         default: [],
      },
   },
   {
      timestamps: false,
      collection: "uptime_alert_logs",
   },
);

uptimeAlertLogSchema.index({ monitorId: 1, firedAt: -1 });
uptimeAlertLogSchema.index({ clientId: 1, firedAt: -1 });

export type UptimeAlertLog = InferSchemaType<typeof uptimeAlertLogSchema>;
export type UptimeAlertLogDocument = HydratedDocument<UptimeAlertLog>;
export const UptimeAlertLogModel = mongoose.model("UptimeAlertLog", uptimeAlertLogSchema);
