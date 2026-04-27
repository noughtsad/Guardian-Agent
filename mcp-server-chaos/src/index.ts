import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetServiceStatus } from "./tools/getServiceStatus.js";
import { registerInjectFault } from "./tools/injectFault.js";
import { registerRollbackService } from "./tools/rollbackService.js";
import { registerGetErrorLogs } from "./tools/getErrorLogs.js";
import { registerGetMetrics } from "./tools/getMetrics.js";

const server = new McpServer({
  name: "chaos-observability-server",
  version: "1.0.0",
});

registerGetServiceStatus(server);
registerInjectFault(server);
registerRollbackService(server);
registerGetErrorLogs(server);
registerGetMetrics(server);

const transport = new StdioServerTransport();
await server.connect(transport);
