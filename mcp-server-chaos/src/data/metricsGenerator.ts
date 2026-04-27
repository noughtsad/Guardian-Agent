import type { ServiceStatus } from "../state/serviceRegistry.js";

export interface MetricDataPoint {
  timestamp: string;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  error_rate_pct: number;
  requests_per_second: number;
  cpu_pct: number;
  memory_mb: number;
}

function jitter(value: number, pct: number): number {
  const range = value * pct;
  return value + (Math.random() * 2 - 1) * range;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateMetrics(
  latencyMs: number,
  errorRatePct: number,
  status: ServiceStatus,
  windowHours: number
): MetricDataPoint[] {
  const now = Date.now();
  const points: MetricDataPoint[] = [];

  // Base memory — stable with slow drift
  let memoryMb = 512 + Math.random() * 512;

  for (let i = windowHours - 1; i >= 0; i--) {
    const ts = new Date(now - i * 60 * 60 * 1000).toISOString();
    const isRecent = i < 3; // last 3 data points: exact values, no jitter

    let rps: number;
    let cpu: number;

    if (status === "healthy") {
      rps = isRecent ? 140 : clamp(Math.random() * 120 + 80, 80, 200);
      cpu = isRecent ? 35 : clamp(Math.random() * 30 + 20, 20, 50);
    } else if (status === "degraded") {
      rps = isRecent ? 40 : clamp(Math.random() * 40 + 20, 20, 60);
      cpu = isRecent ? 72 : clamp(Math.random() * 25 + 60, 60, 85);
    } else {
      // down
      rps = isRecent ? 1 : clamp(Math.random() * 5, 0, 5);
      cpu = isRecent ? 97 : Math.random() > 0.5 ? 0 : 95 + Math.random() * 5;
    }

    // Slow memory drift ±2 MB per hour
    memoryMb = clamp(memoryMb + (Math.random() * 4 - 2), 512, 1024);

    const p99 = isRecent ? latencyMs : jitter(latencyMs, 0.1);
    const p95 = isRecent ? latencyMs * 0.9 : jitter(latencyMs * 0.9, 0.1);
    const p50 = isRecent ? latencyMs * 0.6 : jitter(latencyMs * 0.6, 0.1);
    const errRate = isRecent
      ? errorRatePct
      : clamp(errorRatePct + (Math.random() - 0.5), 0, 100);

    points.push({
      timestamp: ts,
      latency_p50: Math.round(p50 * 100) / 100,
      latency_p95: Math.round(p95 * 100) / 100,
      latency_p99: Math.round(p99 * 100) / 100,
      error_rate_pct: Math.round(errRate * 100) / 100,
      requests_per_second: Math.round(rps * 10) / 10,
      cpu_pct: Math.round(cpu * 10) / 10,
      memory_mb: Math.round(memoryMb),
    });
  }

  return points; // oldest → newest
}
