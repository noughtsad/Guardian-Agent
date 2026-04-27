import type { ToolDefinition } from '../policy/types.js';

interface ToolRegistryEntry {
  server: string;
  schema: Record<string, unknown>;
  description: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map();

  /**
   * Register tools discovered from a server.
   * Atomically replaces all tools for that server.
   */
  registerFromServer(serverName: string, toolDefs: { name: string; description: string; inputSchema: Record<string, unknown> }[]): void {
    // Purge existing tools from this server
    this.purgeServer(serverName);

    // Register new tools
    for (const tool of toolDefs) {
      if (this.tools.has(tool.name)) {
        console.warn(`[ToolRegistry] Tool name collision: "${tool.name}" already registered by another server. Overwriting with ${serverName}.`);
      }
      this.tools.set(tool.name, {
        server: serverName,
        schema: tool.inputSchema,
        description: tool.description,
      });
    }

    console.log(`[ToolRegistry] Registered ${toolDefs.length} tools from server "${serverName}": ${toolDefs.map(t => t.name).join(', ')}`);
  }

  /**
   * Remove all tools belonging to a server.
   */
  purgeServer(serverName: string): void {
    for (const [name, entry] of this.tools) {
      if (entry.server === serverName) {
        this.tools.delete(name);
      }
    }
  }

  /**
   * Get all registered tools in ToolDefinition format (for LLM).
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.entries()).map(([name, entry]) => ({
      name,
      description: entry.description,
      inputSchema: entry.schema,
    }));
  }

  /**
   * Look up which server a tool belongs to.
   */
  getServerForTool(toolName: string): string | null {
    const entry = this.tools.get(toolName);
    return entry ? entry.server : null;
  }

  /**
   * Check if a tool is registered.
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get the total count of registered tools.
   */
  count(): number {
    return this.tools.size;
  }
}
