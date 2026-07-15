import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

// True breaking-point test: no abortOnFail, ramps well past every ceiling
// found so far, so it runs to completion and we read the real degradation
// curve off the end-of-test summary instead of guessing from an early abort.
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const API_KEY = __ENV.API_KEY || "8197381c4f8cdeb988f1eeaa0efd492599041b27fe1aba2261464452834a31a2";

const rateLimited = new Counter("rate_limited_429");
const serverErrors = new Counter("server_errors_5xx");

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
      capacity_ramp: {
         executor: "ramping-arrival-rate",
         startRate: 1000,
         timeUnit: "1s",
         preAllocatedVUs: 500,
         maxVUs: 8000,
         stages: [
            { target: 2500, duration: "15s" },
            { target: 4000, duration: "15s" },
            { target: 5500, duration: "15s" },
            { target: 7000, duration: "15s" },
            { target: 8500, duration: "15s" },
            { target: 10000, duration: "15s" },
            { target: 0, duration: "10s" },
         ],
      },
   },
   // No abortOnFail here on purpose - let it run the full curve so the
   // summary shows exactly where latency/errors bend, not just the first
   // moment a threshold trips.
   thresholds: {
      http_req_duration: ["p(95)<100000"],
      http_req_failed: ["rate<1.0"],
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
      userAgent: "k6-breaking-point/1.0",
   });

   const res = http.post(`${BASE_URL}/api/v1/ingest`, payload, {
      headers: {
         "Content-Type": "application/json",
         "x-api-key": API_KEY,
      },
      timeout: "30s",
   });

   if (res.status === 429) rateLimited.add(1);
   if (res.status >= 500) serverErrors.add(1);

   check(res, {
      "status is 202": (r) => r.status === 202,
   });
}
