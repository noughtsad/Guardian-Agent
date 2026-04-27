import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';

import { getDatabase } from './db/Database.js';
import { WebSocketManager } from './ws/WebSocketServer.js';
import { PolicyEngine } from './policy/PolicyEngine.js';
import { MCPClientManager } from './mcp/MCPClientManager.js';
import { AgentRunner } from './agent/AgentRunner.js';
import { createRulesRouter } from './routes/rulesRouter.js';
import { createLogsRouter } from './routes/logsRouter.js';
import { createAgentRouter } from './routes/agentRouter.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || 'http://localhost:5173';

async function main() {
  // 1. Initialize database
  console.log('[Boot] Initializing database...');
  getDatabase();

  // 2. Create Express app and HTTP server
  const app = express();
  const server = http.createServer(app);

  // 3. Middleware
  app.use(cors({ origin: DASHBOARD_ORIGIN }));
  app.use(express.json());

  // 4. WebSocket server
  console.log('[Boot] Starting WebSocket server...');
  const wsManager = new WebSocketManager(server);
  const broadcast = wsManager.getBroadcast();

  // 5. Policy Engine
  console.log('[Boot] Initializing Policy Engine...');
  const policyEngine = new PolicyEngine(broadcast);

  // 6. MCP Client Manager
  console.log('[Boot] Initializing MCP Client Manager...');
  const mcpConfigPath = process.env.MCP_CONFIG_PATH || './mcp-config.json';
  const mcpManager = new MCPClientManager(path.resolve(mcpConfigPath));
  await mcpManager.initialize();

  // 7. Agent Runner
  console.log('[Boot] Initializing Agent Runner...');
  const agentRunner = new AgentRunner(mcpManager, policyEngine, broadcast);

  // 8. Mount routes
  app.use('/api/rules', createRulesRouter(policyEngine, broadcast));
  app.use('/api/logs', createLogsRouter());
  app.use('/api/agent', createAgentRouter(agentRunner, policyEngine));
  app.use('/api', createAgentRouter(agentRunner, policyEngine)); // For /api/conversations and /api/approvals

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      tools: mcpManager.getToolRegistry().count(),
      rules: policyEngine.getRules().length,
    });
  });

  // 9. SIGHUP handler for hot-reload
  process.on('SIGHUP', async () => {
    console.log('[Hot-Reload] SIGHUP received — reloading MCP server configuration...');
    await mcpManager.reload();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Shutdown] SIGTERM received — shutting down...');
    mcpManager.shutdown();
    server.close();
    process.exit(0);
  });

  // 10. Start server
  server.listen(PORT, () => {
    console.log(`\n🛡️  ArmorIQ Agent Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`🔧 Tools registered: ${mcpManager.getToolRegistry().count()}`);
    console.log(`📏 Active rules: ${policyEngine.getRules().length}\n`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
