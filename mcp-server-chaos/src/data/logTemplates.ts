export const logTemplates = {
  INFO: [
    (svc: string) => `[${svc}] Health check passed. Replica count: 3/3`,
    (svc: string) => `[${svc}] Successfully processed request. duration=43ms`,
    (svc: string) => `[${svc}] Config reloaded from environment`,
    (svc: string) => `[${svc}] Connection pool utilisation at 32%`,
    (svc: string) => `[${svc}] Cache hit ratio: 94.2%`,
  ],
  WARN: [
    (svc: string) => `[${svc}] Retry attempt 1/3 for downstream call`,
    (svc: string) => `[${svc}] Response time approaching SLA threshold: 480ms`,
    (svc: string) => `[${svc}] Memory usage at 78%. GC pressure increasing`,
    (svc: string) => `[${svc}] Circuit breaker in half-open state`,
    (svc: string) => `[${svc}] Rate limit reached for client 192.168.1.45`,
  ],
  ERROR: [
    (svc: string) => `[${svc}] Unhandled exception in request handler: NullPointerException`,
    (svc: string) => `[${svc}] Failed to connect to downstream service after 3 retries`,
    (svc: string) => `[${svc}] Database query timeout after 5000ms`,
    (svc: string) => `[${svc}] Invalid response from dependency: 503 Service Unavailable`,
    (svc: string) => `[${svc}] Request dropped — queue depth exceeded limit of 1000`,
  ],
  CRITICAL: [
    (svc: string) => `[${svc}] PANIC: out of memory — process will restart`,
    (svc: string) => `[${svc}] Data corruption detected in write-ahead log`,
    (svc: string) => `[${svc}] All replicas unreachable — service is DOWN`,
    (svc: string) => `[${svc}] Circuit breaker OPEN — all traffic rejected`,
    (svc: string) => `[${svc}] Disk full on primary node — writes failing`,
  ],
};
