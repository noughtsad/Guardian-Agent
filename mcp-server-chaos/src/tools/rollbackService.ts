import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode, McpError as ErrorResponse } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getService, updateService } from "../state/serviceRegistry.js";

const inputSchema = z.object({
  service_name: z.string(),
  reason: z.string().min(10),
  rolled_back_by: z.string().email(),
});

const baselineMap: Record<string, { latencyMs: number; errorRatePct: number }> = {
  "auth-service":         { latencyMs: 42,  errorRatePct: 0.1 },
  "payment-service":      { latencyMs: 95,  errorRatePct: 0.3 },
  "user-service":         { latencyMs: 65,  errorRatePct: 0.2 },
  "notification-service": { latencyMs: 110, errorRatePct: 0.5 },
  "ledger-service":       { latencyMs: 80,  errorRatePct: 0.2 },
  "analytics-service":    { latencyMs: 300, errorRatePct: 1.1 },
};

function bumpPatchVersion(version: string): string {
  const parts = version.split(".");
  if (parts.length === 3) {
    const patch = parseInt(parts[2], 10);
    if (!isNaN(patch)) {
      parts[2] = (patch + 1).toString();
      return parts.join(".");
    }
  }
  return version + "-rollback";
}

export function registerRollbackService(server: McpServer) {
  server.tool(
    "rollback_service",
    "Rolls back a service to a healthy baseline state, simulating a deployment rollback or incident resolution.",
    inputSchema.shape,
    async (input) => {
      try {
        const parsedResult = inputSchema.safeParse(input);
        if (!parsedResult.success) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${parsedResult.error.message}`);
        }
        
        const parsed = parsedResult.data;

        let service;
        try {
          service = getService(parsed.service_name);
        } catch (e: any) {
          throw new McpError(ErrorCode.InvalidParams, e.message);
        }

        if (service.status === "healthy") {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                service: parsed.service_name,
                already_healthy: true,
              }, null, 2)
            }],
          };
        }

        const baseline = baselineMap[parsed.service_name] || { latencyMs: 100, errorRatePct: 0.5 };
        const newVersion = bumpPatchVersion(service.version);
        const previousStatus = service.status;
        const rolledBackAt = new Date().toISOString();

        updateService(parsed.service_name, {
          status: "healthy",
          latencyMs: baseline.latencyMs,
          errorRatePct: baseline.errorRatePct,
          faultInjectedAt: null,
          faultType: null,
          version: newVersion,
          lastDeployedAt: rolledBackAt,
        });

        const result = {
          success: true,
          service: parsed.service_name,
          previous_status: previousStatus,
          new_status: "healthy",
          new_version: newVersion,
          rolled_back_by: parsed.rolled_back_by,
          reason: parsed.reason,
          rolled_back_at: rolledBackAt,
          already_healthy: false,
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
