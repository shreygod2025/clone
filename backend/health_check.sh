#!/bin/bash
# Health check script for Kubernetes readiness/liveness probe
# Checks backend health at the correct port and API path

HEALTH_URL="http://localhost:8001/api/health"
MAX_RETRIES=3
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_URL")
    if [ "$HTTP_STATUS" = "200" ]; then
        exit 0
    fi
    if [ $i -lt $MAX_RETRIES ]; then
        sleep $RETRY_DELAY
    fi
done

exit 1
