import * as readline from 'readline';
import { createRecordTool } from './tools/createRecord.js';
import { readRecordTool } from './tools/readRecord.js';
import { updateRecordTool } from './tools/updateRecord.js';
import { deleteRecordTool } from './tools/deleteRecord.js';
import { listRecordsTool } from './tools/listRecords.js';

// Register all tools
const tools = [
  createRecordTool,
  readRecordTool,
  updateRecordTool,
  deleteRecordTool,
  listRecordsTool,
];

const toolMap = new Map(tools.map(t => [t.name, t]));

// JSON-RPC 2.0 helpers
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

function jsonRpcResponse(id: string | number, result: any) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

// Handle JSON-RPC requests
function handleRequest(request: JsonRpcRequest): string {
  switch (request.method) {
    case 'initialize': {
      return jsonRpcResponse(request.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'armoriq-custom-db', version: '1.0.0' },
      });
    }

    case 'notifications/initialized': {
      // This is a notification, no response needed but we'll acknowledge
      return '';
    }

    case 'tools/list': {
      const toolDefinitions = tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      return jsonRpcResponse(request.id, { tools: toolDefinitions });
    }

    case 'tools/call': {
      const { name, arguments: args } = request.params || {};
      const tool = toolMap.get(name);

      if (!tool) {
        return jsonRpcError(request.id, -32601, `Tool not found: ${name}`);
      }

      try {
        const result = tool.execute(args);
        return jsonRpcResponse(request.id, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonRpcResponse(request.id, {
          content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
          isError: true,
        });
      }
    }

    default:
      return jsonRpcError(request.id, -32601, `Method not found: ${request.method}`);
  }
}

// Stdio transport: read line-delimited JSON-RPC from stdin, write to stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on('line', (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed) as JsonRpcRequest;
    const response = handleRequest(request);
    if (response) {
      process.stdout.write(response + '\n');
    }
  } catch (err) {
    const errorResponse = jsonRpcError(null, -32700, 'Parse error');
    process.stdout.write(errorResponse + '\n');
  }
});

rl.on('close', () => {
  process.exit(0);
});

// Log to stderr so it doesn't interfere with JSON-RPC on stdout
process.stderr.write('ArmorIQ Custom MCP Server started (stdio)\n');
