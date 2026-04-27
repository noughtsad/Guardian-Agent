import fs from 'fs';
import path from 'path';
import { MCPStdioTransport } from './MCPStdioTransport.js';
import { MCPSSETransport } from './MCPSSETransport.js';
import { ToolRegistry } from './ToolRegistry.js';
import type { ToolCall, ToolResult } from '../policy/types.js';

interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  apiKey?: string;
}

interface MCPConnection {
  config: MCPServerConfig;
  transport: MCPStdioTransport | MCPSSETransport;
  retryCount: number;
}

export class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map();
  private toolRegistry: ToolRegistry;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.toolRegistry = new ToolRegistry();
  }

  /**
   * Initialize all MCP server connections from config.
   */
  async initialize(): Promise<void> {
    const configs = this.loadConfig();
    console.log(`[MCPClientManager] Loading ${configs.length} MCP server(s)...`);

    const results = await Promise.allSettled(
      configs.map(config => this.connectServer(config))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[MCPClientManager] Failed to connect to "${configs[i].name}": ${result.reason}`);
      }
    });

    console.log(`[MCPClientManager] Initialized with ${this.toolRegistry.count()} tools from ${this.connections.size} server(s)`);
  }

  /**
   * Connect to a single MCP server.
   */
  private async connectServer(config: MCPServerConfig): Promise<void> {
    let transport: MCPStdioTransport | MCPSSETransport;

    if (config.transport === 'stdio') {
      if (!config.command) throw new Error(`stdio server "${config.name}" requires a command`);
      transport = new MCPStdioTransport(config.command, config.args || []);
    } else {
      if (!config.url) throw new Error(`SSE server "${config.name}" requires a url`);
      transport = new MCPSSETransport(config.url, config.apiKey);
    }

    // Connect
    await transport.connect();

    // Set up disconnect handler for reconnection
    transport.on('disconnect', () => {
      console.warn(`[MCPClientManager] Server "${config.name}" disconnected. Attempting reconnect...`);
      this.toolRegistry.purgeServer(config.name);
      this.reconnectWithBackoff(config);
    });

    const connection: MCPConnection = { config, transport, retryCount: 0 };
    this.connections.set(config.name, connection);

    // Initialize the MCP protocol
    try {
      await transport.send('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'armoriq-agent', version: '1.0.0' },
      });
    } catch {
      // Some servers may not implement initialize — that's OK
    }

    // Discover tools
    await this.discoverTools(config.name);
  }

  /**
   * Discover tools from a connected server.
   */
  private async discoverTools(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (!connection) return;

    try {
      const result = await connection.transport.send('tools/list');
      const tools = result.tools || [];
      this.toolRegistry.registerFromServer(serverName, tools);
    } catch (err) {
      console.error(`[MCPClientManager] Failed to discover tools from "${serverName}": ${err}`);
    }
  }

  /**
   * Reconnect to a server with exponential backoff.
   */
  private async reconnectWithBackoff(config: MCPServerConfig): Promise<void> {
    const maxRetries = 5;
    const connection = this.connections.get(config.name);
    const retryCount = connection ? connection.retryCount + 1 : 1;

    if (retryCount > maxRetries) {
      console.error(`[MCPClientManager] Giving up on "${config.name}" after ${maxRetries} retries`);
      this.connections.delete(config.name);
      return;
    }

    const delay = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
    console.log(`[MCPClientManager] Reconnecting to "${config.name}" in ${delay}ms (attempt ${retryCount}/${maxRetries})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Disconnect old transport first
      if (connection) {
        connection.transport.disconnect();
      }

      await this.connectServer(config);
      const newConnection = this.connections.get(config.name);
      if (newConnection) {
        newConnection.retryCount = 0; // Reset on successful connect
      }
      console.log(`[MCPClientManager] Successfully reconnected to "${config.name}"`);
    } catch (err) {
      console.error(`[MCPClientManager] Reconnect attempt ${retryCount} failed for "${config.name}": ${err}`);
      if (connection) {
        connection.retryCount = retryCount;
      }
      this.reconnectWithBackoff(config);
    }
  }

  /**
   * Execute a tool call on the appropriate MCP server.
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const serverName = this.toolRegistry.getServerForTool(toolCall.name);
    if (!serverName) {
      return {
        toolCallId: toolCall.id,
        content: `Tool "${toolCall.name}" not found in any connected MCP server`,
        isError: true,
      };
    }

    const connection = this.connections.get(serverName);
    if (!connection || !connection.transport.isConnected()) {
      return {
        toolCallId: toolCall.id,
        content: `MCP server "${serverName}" is not connected`,
        isError: true,
      };
    }

    try {
      const result = await connection.transport.send('tools/call', {
        name: toolCall.name,
        arguments: toolCall.input,
      });

      const content = result.content
        ?.map((c: any) => c.text || JSON.stringify(c))
        .join('\n') || '';

      return {
        toolCallId: toolCall.id,
        content,
        isError: result.isError || false,
      };
    } catch (err) {
      return {
        toolCallId: toolCall.id,
        content: `MCP server error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  }

  /**
   * Get the tool registry (for passing tool definitions to LLM).
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Load MCP config from file.
   */
  private loadConfig(): MCPServerConfig[] {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      // Replace env variable references
      const resolved = raw.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || '');
      return JSON.parse(resolved) as MCPServerConfig[];
    } catch (err) {
      console.error(`[MCPClientManager] Failed to load config from ${this.configPath}: ${err}`);
      return [];
    }
  }

  /**
   * Reload config (for SIGHUP hot-reload).
   */
  async reload(): Promise<void> {
    console.log('[MCPClientManager] Reloading MCP server configuration...');

    // Disconnect all existing
    for (const [name, conn] of this.connections) {
      conn.transport.disconnect();
      this.toolRegistry.purgeServer(name);
    }
    this.connections.clear();

    // Re-initialize
    await this.initialize();
  }

  /**
   * Gracefully shut down all connections.
   */
  shutdown(): void {
    for (const [name, conn] of this.connections) {
      conn.transport.disconnect();
    }
    this.connections.clear();
  }
}
