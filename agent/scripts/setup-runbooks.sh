#!/bin/sh
# Creates SRE runbooks under /tmp/runbooks for the Filesystem MCP server.
# Re-run this anytime the temp directory is cleared.

set -eu

DISPLAY_DIR="/tmp/runbooks"
UNAME="$(uname -s 2>/dev/null || echo unknown)"

case "$UNAME" in
  MINGW*|MSYS*|CYGWIN*)
    RUNBOOK_DIR="/c/tmp/runbooks"
    ;;
  *)
    RUNBOOK_DIR="$DISPLAY_DIR"
    ;;
esac

mkdir -p "$RUNBOOK_DIR"

echo "Creating runbooks in $DISPLAY_DIR ..."

cat > "$RUNBOOK_DIR/payment-service-latency.md" <<'EOF'
# Payment Service - Latency Spike Runbook

## Symptoms
- p95 latency > 2000ms
- p99 latency > 5000ms
- Fault type: `latency_spike`
- Downstream impact: ledger-service write throughput degraded

## Diagnosis Steps
1. Call `get_service_status` for `payment-service` and confirm status is `degraded`.
2. Call `get_metrics` for `payment-service` - check p95/p99 latency trend across last 24 data points.
3. Call `get_error_logs` for `payment-service` with level `WARNING` - look for timeout patterns.
4. Check upstream: call `get_service_status` for `auth-service` - auth latency cascades downstream.
5. Check downstream: call `get_service_status` for `ledger-service` - confirm whether ledger is also affected.

## Resolution

### If fault is isolated to payment-service:
1. Call `rollback_service` with:
   - `service_name`: `payment-service`
   - `reason`: `Latency spike detected - p95 exceeded 2000ms threshold`
   - `rolled_back_by`: on-call engineer email
2. Wait 2 minutes, then call `get_metrics` again to confirm p95 returning to baseline (< 200ms).
3. Monitor for 10 minutes post-rollback.

### If auth-service is also degraded:
1. Rollback `auth-service` first (upstream), then `payment-service`.
2. Sequence matters - fixing upstream first prevents re-triggering.

## Escalation
- Notify on-call via PagerDuty if latency does not drop within 5 minutes of rollback.
- SLA breach threshold: p99 > 5000ms for more than 3 consecutive minutes.

## Post-Incident
- Log incident in `db_create_record` (table: `incidents`) with timestamp, severity, and resolution method.
EOF

cat > "$RUNBOOK_DIR/ledger-service-outage.md" <<'EOF'
# Ledger Service - Complete Outage Runbook

## Symptoms
- Status: `down`
- Error rate: 100%
- All writes failing
- Fault type: `complete_outage`
- Downstream: analytics-service reporting stale data

## Diagnosis Steps
1. Call `get_service_status` for `ledger-service` - confirm status is `down`.
2. Call `get_error_logs` for `ledger-service` with level `CRITICAL` - look for disk full or OOM errors.
3. Call `get_metrics` for `ledger-service` - confirm error rate is at 1.0 (100%).
4. Check if fault was manually injected: look for `inject_fault` in recent audit logs.
5. Call `get_service_status` for `analytics-service` - it depends on ledger; confirm impact scope.

## Resolution

### If fault was injected (test/chaos scenario):
1. Call `rollback_service` with:
   - `service_name`: `ledger-service`
   - `reason`: `Complete outage - injected fault cleared`
   - `rolled_back_by`: on-call engineer email
2. Confirm version number increments in the rollback response.
3. Call `get_service_status` - confirm status returns to `healthy`.
4. Call `get_metrics` - confirm error rate drops to ~0.

### If disk full (CRITICAL log entries indicate disk):
1. Clear `/tmp` files on primary node manually (outside agent scope - escalate to infra).
2. After infra clears disk, call `rollback_service` to reset the service state.

### If OOM:
1. Escalate immediately - agent cannot restart processes.
2. Call `rollback_service` to reset in-memory state while infra restarts the pod.

## Post-Incident
- Notify: arjun@company.com (on-call engineer)
- Monitor `get_metrics` for 10 minutes post-rollback.
- Log to `db_create_record` (table: `incidents`).
EOF

cat > "$RUNBOOK_DIR/circuit-breaker-runbook.md" <<'EOF'
# Circuit Breaker - Open Circuit Runbook

## What is a Circuit Breaker?
A circuit breaker is a pattern that stops requests to a downstream service when its error rate exceeds a threshold. When "open", all calls to that service are short-circuited - they fail immediately without hitting the service.

## Symptoms
- Upstream service reporting high error rate despite being healthy itself
- `get_error_logs` shows: `Circuit breaker OPEN for <service>`
- Downstream service status is `degraded` or `down`

## Diagnosis Steps
1. Identify which service pair is affected:
   - Call `get_service_status` for all services (omit `service_name`) to get a full health map.
   - Look for a healthy upstream with a degraded/down downstream.
2. Call `get_error_logs` for the upstream service - confirm circuit breaker log entries.
3. Call `get_metrics` for the downstream service - confirm sustained high error rate.

## Resolution

### Standard recovery (downstream recovers on its own):
1. Wait for the downstream service's error rate to drop (poll `get_metrics` every 30s).
2. Once error rate < 5%, the circuit will close automatically (half-open -> closed).
3. Call `get_service_status` to confirm healthy handshake.

### Forced recovery (downstream needs rollback):
1. Call `rollback_service` on the downstream service:
   - `reason`: `Circuit breaker recovery - rolling back to clear error rate`
   - `rolled_back_by`: on-call engineer email
2. Confirm downstream returns to `healthy`.
3. The upstream circuit breaker will close within 1-2 minutes.

### If multiple circuit breakers open simultaneously:
1. Fix the root cause first - trace the dependency chain using `get_service_status`.
2. Roll back the deepest downstream first, then work upstream.
3. Dependency order: `auth-service` -> `payment-service` -> `ledger-service` -> `analytics-service`

## Notes
- Never rollback the upstream service to fix a circuit breaker - it won't help.
- Always fix the downstream (failing) service.
EOF

cat > "$RUNBOOK_DIR/rollback-procedure.md" <<'EOF'
# General Rollback Procedure - SOP

## Overview
This runbook defines the standard operating procedure for rolling back any service in the ArmorIQ environment. Always follow this procedure - do not call `rollback_service` without completing the pre-checks.

## Pre-Rollback Checklist
- [ ] Confirm the service is actually unhealthy via `get_service_status`
- [ ] Confirm the fault type via `get_error_logs`
- [ ] Confirm error rate via `get_metrics`
- [ ] Identify all downstream services that will be affected
- [ ] Obtain approval if a `REQUIRE_APPROVAL` policy rule is active (wait for admin to approve in dashboard)
- [ ] Have the on-call engineer email ready for `rolled_back_by`

## Rollback Steps

### 1. Pre-rollback snapshot
Call `get_service_status` for the target service. Note the current version number before rollback.

### 2. Execute rollback
Call `rollback_service` with:
- `service_name`: exact service name (see valid services below)
- `reason`: clear, human-readable explanation (minimum 10 characters)
- `rolled_back_by`: valid email address of the on-call engineer

### 3. Confirm success
The `rollback_service` response will include:
- `previousVersion`: the version before rollback
- `currentVersion`: the new version (should be incremented)
- `status`: should be `healthy`
- `timestamp`: when the rollback was applied

### 4. Post-rollback monitoring
- Call `get_metrics` immediately after rollback - confirm error rate dropping.
- Call `get_service_status` - confirm status is `healthy`.
- Monitor for 10 minutes. If error rate creeps back up, escalate.

### 5. Log the incident
Call `db_create_record` with:
- `table`: `incidents`
- `data`: `{ "service": "<name>", "action": "rollback", "reason": "<reason>", "engineer": "<email>", "timestamp": "<ISO timestamp>" }`

## Valid Service Names
- `auth-service`
- `payment-service`
- `user-service`
- `notification-service`
- `ledger-service`
- `analytics-service`

## Dependency Map (roll back in this order for cascading outages)
```
auth-service
  `-- payment-service
        `-- ledger-service
              `-- analytics-service
user-service
  `-- notification-service
```
Always rollback the deepest downstream first.

## Escalation
- If rollback does not resolve within 5 minutes: page the on-call SRE lead.
- If 2+ services are simultaneously `down`: declare an incident and escalate to engineering manager.
- Contact: arjun@company.com (primary on-call)
EOF

echo "All runbooks created in $DISPLAY_DIR"
ls -la "$RUNBOOK_DIR"
