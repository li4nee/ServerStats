#!/usr/bin/env bash
# Polls the RabbitMQ management API for queue depth while a k6 test runs,
# so you can prove the consumer keeps pace with ingest (not just that HTTP
# accepted requests fast). Run this in the background alongside k6:
#
#   ./monitor-queue.sh 300 > queue-depth.csv &
#   RATE=250 DURATION=5m k6 run sustained-load-test.js
#
# Columns: unix_ts,messages_ready,messages_unacked,messages_total,publish_rate,deliver_rate

set -euo pipefail

DURATION_SECONDS="${1:-300}"
INTERVAL="${2:-2}"
MGMT_URL="${RABBITMQ_MGMT_URL:-http://localhost:15673}"
MGMT_USER="${RABBITMQ_USER:-root}"
MGMT_PASS="${RABBITMQ_PASS:-1234567890}"
QUEUE="${RABBITMQ_QUEUE:-server_monitoring_queue}"
VHOST_ENCODED="%2F"

echo "unix_ts,messages_ready,messages_unacked,messages_total,publish_rate,deliver_rate"

elapsed=0
while [ "$elapsed" -lt "$DURATION_SECONDS" ]; do
   response=$(curl -s -u "${MGMT_USER}:${MGMT_PASS}" "${MGMT_URL}/api/queues/${VHOST_ENCODED}/${QUEUE}")
   ts=$(date +%s)
   echo "$response" | node -e '
      let data = "";
      process.stdin.on("data", d => data += d);
      process.stdin.on("end", () => {
         const q = JSON.parse(data);
         const ready = q.messages_ready ?? 0;
         const unacked = q.messages_unacknowledged ?? 0;
         const total = q.messages ?? 0;
         const pubRate = q.message_stats?.publish_details?.rate ?? 0;
         const delRate = q.message_stats?.deliver_get_details?.rate ?? 0;
         console.log(`'"$ts"',${ready},${unacked},${total},${pubRate},${delRate}`);
      });
   '
   sleep "$INTERVAL"
   elapsed=$((elapsed + INTERVAL))
done
