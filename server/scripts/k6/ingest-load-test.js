import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const API_KEY = __ENV.API_KEY || "8197381c4f8cdeb988f1eeaa0efd492599041b27fe1aba2261464452834a31a2";

const rateLimited = new Counter("rate_limited_429");
const validationErrors = new Counter("validation_errors_400");
const serverErrors = new Counter("server_errors_5xx");

const SERVICES = ["checkout-service", "auth-service", "payments-api", "inventory-service", "notifications-worker"];

const ENDPOINTS = [
   "/api/orders",
   "/api/orders/:id",
   "/api/users/login",
   "/api/users/:id",
   "/api/payments/charge",
   "/api/inventory/:sku",
   "/api/notifications/send",
];

const METHODS = ["GET", "GET", "GET", "POST", "POST", "PUT", "DELETE"];

// Weighted so most hits look healthy, with a realistic sprinkling of errors
// and occasional latency spikes to give alerting rules something to trip on.
const STATUS_CODES = [200, 200, 200, 200, 200, 200, 201, 204, 301, 400, 401, 404, 429, 500, 502, 503];

function pick(arr) {
   return arr[Math.floor(Math.random() * arr.length)];
}

function randomLatency() {
   // ~90% normal latency, ~10% spike, to exercise both baseline and anomaly paths.
   if (Math.random() < 0.1) {
      return Math.floor(800 + Math.random() * 4000);
   }
   return Math.floor(15 + Math.random() * 250);
}

function randomIp() {
   return `${1 + Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
}

export const options = {
   scenarios: {
      seed_ingest: {
         executor: "constant-arrival-rate",
         // Stays comfortably under the 100 req/min per-IP limit (RATE_LIMIT_MAX in .env).
         rate: 80,
         timeUnit: "1m",
         duration: __ENV.DURATION || "3m",
         preAllocatedVUs: 5,
         maxVUs: 10,
      },
   },
   thresholds: {
      http_req_failed: ["rate<0.05"],
      rate_limited_429: ["count<1"],
   },
};

export default function () {
   const payload = JSON.stringify({
      serviceName: pick(SERVICES),
      endpoint: pick(ENDPOINTS),
      method: pick(METHODS),
      statusCode: pick(STATUS_CODES),
      latencyMs: randomLatency(),
      ipInIpv4: randomIp(),
      userAgent: "k6-load-test/1.0",
   });

   const res = http.post(`${BASE_URL}/api/v1/ingest`, payload, {
      headers: {
         "Content-Type": "application/json",
         "x-api-key": API_KEY,
      },
   });

   if (res.status === 429) rateLimited.add(1);
   if (res.status === 400) validationErrors.add(1);
   if (res.status >= 500) serverErrors.add(1);

   check(res, {
      "status is 202": (r) => r.status === 202,
   });
}
