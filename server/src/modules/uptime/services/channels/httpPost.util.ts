import https from "https";
import http from "http";

/** Minimal JSON POST used by the webhook/Slack/Discord uptime channels — no new HTTP client dependency. */
export function postJson(url: string, body: unknown, timeoutMs = 10000): Promise<void> {
   return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === "https:";
      const lib = isHttps ? https : http;

      const req = lib.request(
         {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               "Content-Length": Buffer.byteLength(data),
            },
         },
         (res) => {
            res.resume();
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
               resolve();
            } else {
               reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            }
         },
      );

      req.on("error", reject);
      req.setTimeout(timeoutMs, () => {
         req.destroy(new Error(`Request to ${url} timed out`));
      });
      req.write(data);
      req.end();
   });
}
