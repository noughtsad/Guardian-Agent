import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getService, type IncidentLog } from "../state/serviceRegistry.js";
import { logTemplates } from "../data/logTemplates.js";

const inputSchema = z.object({
  service_name: z.string(),
  limit: z.number().int().min(1).max(50).default(10),
  level: z.enum(["INFO", "WARN", "ERROR", "CRITICAL", "ALL"]).default("ALL"),
});

function randomUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomTraceId() {
  return "trace-" + Math.random().toString(16).substring(2, 10);
}

export function registerGetErrorLogs(server: McpServer) {
  server.tool(
    "get_error_logs",
    "Returns recent error logs for a named service. Logs are generated based on service status.",
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

        const logs: IncidentLog[] = [];
        const now = Date.now();

        for (let i = 0; i < parsed.limit; i++) {
          let lvl: "INFO" | "WARN" | "ERROR" | "CRITICAL" = "INFO";
          const r = Math.random();

          if (service.status === "healthy") {
            if (r < 0.7) lvl = "INFO";
            else if (r < 0.9) lvl = "WARN";
            else lvl = "ERROR";
          } else if (service.status === "degraded") {
            if (r < 0.1) lvl = "INFO";
            else if (r < 0.3) lvl = "WARN";
            else if (r < 0.8) lvl = "ERROR";
            else lvl = "CRITICAL";
          } else {
            // down
            if (r < 0.3) lvl = "ERROR";
            else lvl = "CRITICAL";
          }
          
          if (parsed.level !== "ALL" && lvl !== parsed.level) {
             // If filtered out, let's keep generating until we get one that matches or just try...
             // Actually, the spec says "generate limit number of fake log lines... If level filter is not ALL, filter generated logs to only that level."
             // Wait, if it generates 10 and filters, it might return 0. The spec says "generate `limit` number..." and "If level filter... filter generated logs".
             // We can do it that way.
          }
          
          const templates = logTemplates[lvl];
          const template = templates[Math.floor(Math.random() * templates.length)];
          
          logs.push({
            id: randomUUID(),
            serviceId: service.name,
            timestamp: new Date(now - Math.random() * 30 * 60 * 1000).toISOString(),
            level: lvl,
            message: template(service.name),
            traceId: randomTraceId(),
          });
        }

        let filteredLogs = logs;
        if (parsed.level !== "ALL") {
          filteredLogs = logs.filter(l => l.level === parsed.level);
        }

        // Sort descending
        filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const result = {
          service: service.name,
          status: service.status,
          total_returned: filteredLogs.length,
          logs: filteredLogs,
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
