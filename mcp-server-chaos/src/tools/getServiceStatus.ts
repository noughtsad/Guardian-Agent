import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  getAllServices,
  getService,
  getDependents,
  getUnhealthyServices,
} from "../state/serviceRegistry.js";

const inputSchema = z.object({
  service_name: z.string().optional(),
});

export function registerGetServiceStatus(server: McpServer) {
  server.tool(
    "get_service_status",
    "Returns the current health status of one or all services, including upstream/downstream dependency impact.",
    inputSchema.shape,
    async (input) => {
      try {
        const parsed = inputSchema.parse(input);

        if (!parsed.service_name) {
          const allServices = getAllServices();
          const unhealthy = getUnhealthyServices();
          
          let systemHealth = "healthy";
          if (unhealthy.length > 0) {
            if (unhealthy.some(s => s.status === "down")) {
              systemHealth = "critical";
            } else {
              systemHealth = "degraded";
            }
          }

          const result = {
            system_health: systemHealth,
            incident_count: unhealthy.length,
            services: allServices,
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } else {
          let service;
          try {
            service = getService(parsed.service_name);
          } catch (e: any) {
            throw new McpError(ErrorCode.InvalidParams, e.message);
          }

          const upstream_dependencies = service.dependsOn.map(name => {
            try {
              return getService(name);
            } catch {
              return null;
            }
          }).filter(Boolean);

          const downstream_impact = getDependents(parsed.service_name);

          const result = {
            service,
            upstream_dependencies,
            downstream_impact,
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        }
      } catch (err: any) {
        if (err instanceof McpError) throw err;
        throw new McpError(ErrorCode.InternalError, err.message || "Internal error");
      }
    }
  );
}
