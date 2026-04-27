import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getService } from "../state/serviceRegistry.js";
import { generateMetrics } from "../data/metricsGenerator.js";

const inputSchema = z.object({
  service_name: z.string(),
  window_hours: z.number().int().min(1).max(24).default(24),
});

export function registerGetMetrics(server: McpServer) {
  server.tool(
    "get_metrics",
    "Returns a 24-point timeseries (one data point per hour) of latency and error rate for a named service.",
    inputSchema.shape,
    async (input) => {
      try {
        const parsed = inputSchema.parse(input);

        let service;
        try {
          service = getService(parsed.service_name);
        } catch (e: any) {
          throw new McpError(ErrorCode.InvalidParams, e.message);
        }

        const datapoints = generateMetrics(
          service.latencyMs,
          service.errorRatePct,
          service.status,
          parsed.window_hours
        );

        let sumLatency = 0;
        let sumError = 0;
        let peakLatency = 0;
        let peakError = 0;
        let totalRequestsEstimated = 0;

        for (const point of datapoints) {
          sumLatency += point.latency_p99;
          sumError += point.error_rate_pct;
          peakLatency = Math.max(peakLatency, point.latency_p99);
          peakError = Math.max(peakError, point.error_rate_pct);
          totalRequestsEstimated += Math.round(point.requests_per_second * 3600);
        }

        const count = datapoints.length > 0 ? datapoints.length : 1;
        const avg_latency_p99_ms = Math.round((sumLatency / count) * 100) / 100;
        const avg_error_rate_pct = Math.round((sumError / count) * 100) / 100;

        const summary = {
          avg_latency_p99_ms,
          avg_error_rate_pct,
          peak_latency_p99_ms: peakLatency,
          peak_error_rate_pct: peakError,
          total_requests_estimated: totalRequestsEstimated,
        };

        const result = {
          service: service.name,
          status: service.status,
          window_hours: parsed.window_hours,
          summary,
          datapoints,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        if (err instanceof McpError) throw err;
        throw new McpError(ErrorCode.InternalError, err.message || "Internal error");
      }
    }
  );
}
