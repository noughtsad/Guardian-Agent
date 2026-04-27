import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  getService,
  updateService,
  getDependents,
  type FaultType,
  type ServiceStatus
} from "../state/serviceRegistry.js";

const inputSchema = z.object({
  service_name: z.string(),
  fault_type: z.enum(["latency_spike", "error_rate_spike", "complete_outage"]),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});

export function registerInjectFault(server: McpServer) {
  server.tool(
    "inject_fault",
    "Injects a fault into a named service, simulating a production incident.",
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

        const isAlreadyDown = service.status === "down";

        let newStatus: ServiceStatus = "degraded";
        let newLatencyMs = service.latencyMs;
        let newErrorRatePct = service.errorRatePct;

        if (parsed.fault_type === "complete_outage") {
          newStatus = "down";
          newLatencyMs = 0;
          newErrorRatePct = 100;
        } else if (parsed.fault_type === "latency_spike") {
          if (parsed.severity === "low") {
            newLatencyMs *= 3;
          } else if (parsed.severity === "medium") {
            newLatencyMs *= 8;
            newErrorRatePct += 2;
          } else if (parsed.severity === "high") {
            newLatencyMs *= 20;
            newErrorRatePct += 5;
          }
        } else if (parsed.fault_type === "error_rate_spike") {
          if (parsed.severity === "low") {
            newLatencyMs += 100;
            newErrorRatePct += 5;
          } else if (parsed.severity === "medium") {
            newLatencyMs += 200;
            newErrorRatePct += 15;
          } else if (parsed.severity === "high") {
            newLatencyMs += 300;
            newErrorRatePct += 40;
          }
        }

        // Clamp error rate
        newErrorRatePct = Math.min(100, Math.max(0, newErrorRatePct));
        const faultInjectedAt = new Date().toISOString();

        updateService(parsed.service_name, {
          status: newStatus,
          latencyMs: newLatencyMs,
          errorRatePct: newErrorRatePct,
          faultType: parsed.fault_type,
          faultInjectedAt
        });

        const dependents = getDependents(parsed.service_name);
        const cascadeWarning = dependents.length > 0
          ? `Warning: ${dependents.map(d => d.name).join(", ")} depend(s) on ${parsed.service_name} and may be affected.`
          : null;

        const result: any = {
          success: true,
          service: parsed.service_name,
          fault_type: parsed.fault_type,
          severity: parsed.severity,
          new_status: newStatus,
          new_latency_ms: newLatencyMs,
          new_error_rate_pct: newErrorRatePct,
          faultInjectedAt,
          cascade_warning: cascadeWarning,
        };

        if (isAlreadyDown) {
          result.already_down = true;
        }

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
