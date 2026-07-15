import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

// Same methodology as capacity-run-4..9 (strict p95<300ms, abortOnFail) but
// pushed to a much higher target now that CONSUMER_PREFETCH_COUNT and
// POSTGRES_MAX_POOL_SIZE have been raised from 20/10 to 50/50.
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
         startRate: 500,
         timeUnit: "1s",
         preAllocatedVUs: 200,
         maxVUs: 3000,
         stages: [
            { target: 1500, duration: "15s" },
            { target: 3000, duration: "20s" },
            { target: 4500, duration: "20s" },
            { target: 6000, duration: "20s" },
            { target: 0, duration: "10s" },
         ],
      },
   },
   thresholds: {
      http_req_duration: [{ threshold: "p(95)<300", abortOnFail: true, delayAbortEval: "10s" }],
      http_req_failed: [{ threshold: "rate<0.5", abortOnFail: false, delayAbortEval: "10s" }],
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
      userAgent: "k6-capacity-ceiling-retest/1.0",
   });

   const res = http.post(`${BASE_URL}/api/v1/ingest`, payload, {
      headers: {
         "Content-Type": "application/json",
         "x-api-key": API_KEY,
      },
   });

   if (res.status === 429) rateLimited.add(1);
   if (res.status >= 500) serverErrors.add(1);

   check(res, {
      "status is 202": (r) => r.status === 202,
   });
}
