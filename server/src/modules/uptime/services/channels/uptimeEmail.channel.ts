import logger from "../../../../shared/config/logger.config";
import { globalConfig } from "../../../../shared/config/global.config";
import { escapeHtml } from "../../../../shared/utils/html.utils";
import { sendViaResend } from "../../../../shared/utils/resendMailer.utils";
import { IUptimeAlertChannel, UptimeDispatchPayload } from "./uptimeAlertChannel.interface";

const REASON_LABEL: Record<UptimeDispatchPayload["reason"], string> = {
   down: "Down",
   slow_response: "Slow Response",
   recovery: "Recovered",
};

export class UptimeEmailChannel implements IUptimeAlertChannel {
   readonly type = "email";

   private buildHtml(payload: UptimeDispatchPayload): string {
      const esc = escapeHtml;
      const accent = payload.reason === "recovery" ? "#2f9e44" : "#e5484d";

      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eceef1;">
      <tr><td style="height:4px;background:${accent};line-height:0;font-size:0;">&nbsp;</td></tr>
      <tr>
         <td style="padding:28px 32px 20px;">
            <div style="display:inline-block;padding:4px 10px;background:${accent}1a;color:${accent};font-size:12px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;border-radius:999px;margin-bottom:14px;">
               Uptime ${esc(REASON_LABEL[payload.reason])}
            </div>
            <h1 style="margin:0 0 6px;font-size:20px;line-height:1.35;color:#111318;">${esc(payload.monitor.name)}</h1>
            <p style="margin:0;font-size:13px;color:#6b7280;">${esc(payload.monitor.targetUrl)}</p>
         </td>
      </tr>
      <tr>
         <td style="padding:0 32px 24px;">
            <p style="margin:0 0 12px;font-size:14px;color:#111318;">${esc(payload.message)}</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">
               Status: ${payload.stats.statusCode ?? "n/a"} &middot; Latency: ${payload.stats.latencyMs}ms &middot;
               Consecutive failures: ${payload.stats.consecutiveFailures}
            </p>
         </td>
      </tr>
      <tr>
         <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eceef1;">
            <p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.6;">
               Fired ${esc(payload.firedAt)} &middot; Monitor <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(payload.monitor.id)}</span>
            </p>
         </td>
      </tr>
   </table>
</body>
</html>`;
   }

   async dispatch(config: Record<string, unknown>, payload: UptimeDispatchPayload): Promise<void> {
      const to = config.to as string | string[];
      if (!to || (Array.isArray(to) && to.length === 0)) {
         logger.warn("[UptimeEmailChannel] Missing 'to' in config. Skipping.");
         return;
      }

      if (!globalConfig.email.resendApiKey) {
         logger.warn("[UptimeEmailChannel] RESEND_API_KEY is not configured. Skipping.");
         return;
      }

      const toList = Array.isArray(to) ? to : [to];
      const from = (config.from as string) || globalConfig.email.defaultFrom;
      const subject = (config.subject as string) || `Uptime ${REASON_LABEL[payload.reason]}: ${payload.monitor.name}`;

      await sendViaResend({
         apiKey: globalConfig.email.resendApiKey,
         from,
         to: toList,
         subject,
         html: this.buildHtml(payload),
      });

      logger.info(`[UptimeEmailChannel] Email dispatched via Resend to ${toList.join(", ")} for monitor ${payload.monitor.id}`);
   }
}
