import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

// Soak test: holds a FIXED rate for several minutes to prove a sustained
// throughput number, rather than a burst peak. Run capacity-test.js first to
// find the breaking point, then set RATE here to ~70% of that ceiling.
//
// Usage:
//   RATE=250 DURATION=5m k6 run sustained-load-test.js
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const API_KEY = __ENV.API_KEY || "8197381c4f8cdeb988f1eeaa0efd492599041b27fe1aba2261464452834a31a2";
const RATE = parseInt(__ENV.RATE || "100", 10);
const DURATION = __ENV.DURATION || "5m";
// Little's law-ish headroom: rate * expected-latency-seconds * safety factor.
const MAX_VUS = Math.max(50, RATE * 2);

const rateLimited = new Counter("rate_limited_429");
const serverErrors = new Counter("server_errors_5xx");
const ingestLatency = new Trend("ingest_latency_ms", true);

const SERVICES = ["checkout-service", "auth-service", "payments-api", "inventory-service", "notifications-worker"];
const ENDPOINTS = ["/api/orders", "/api/orders/:id", "/api/users/login", "/api/users/:id", "/api/payments/charge"];
const METHODS = ["GET", "GET", "GET", "POST", "PUT"];
const STATUS_CODES = [200, 200, 200, 201, 204, 400, 404, 500];

function pick(arr) {
   return arr[Math.floor(Math.random() * arr.length)];
}

function randomIp() {
   return `${1 + Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
}

export const options = {
   scenarios: {
      sustained: {
         executor: "constant-arrival-rate",
         rate: RATE,
         timeUnit: "1s",
         duration: DURATION,
         preAllocatedVUs: Math.min(MAX_VUS, 200),
         maxVUs: MAX_VUS,
      },
   },
   thresholds: {
      // These are the bar for "this rate is genuinely sustained", not just survived.
      http_req_failed: ["rate<0.01"],
      rate_limited_429: ["count==0"],
      http_req_duration: ["p(95)<500", "p(99)<1000"],
   },
};

export default function () {
   const payload = JSON.stringify({
      serviceName: pick(SERVICES),
      endpoint: pick(ENDPOINTS),
      method: pick(METHODS),
      statusCode: pick(STATUS_CODES),
      latencyMs: Math.floor(15 + Math.random() * 250),
      ipInIpv4: randomIp(),
      userAgent: "k6-sustained-test/1.0",
   });

   const res = http.post(`${BASE_URL}/api/v1/ingest`, payload, {
      headers: {
         "Content-Type": "application/json",
         "x-api-key": API_KEY,
      },
   });

   ingestLatency.add(res.timings.duration);
   if (res.status === 429) rateLimited.add(1);
   if (res.status >= 500) serverErrors.add(1);

   check(res, {
      "status is 202": (r) => r.status === 202,
   });
}
