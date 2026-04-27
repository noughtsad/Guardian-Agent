import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

export class MCPStdioTransport extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> = new Map();
  private command: string;
  private args: string[];
  private rl: readline.Interface | null = null;

  constructor(command: string, args: string[]) {
    super();
    this.command = command;
    this.args = args;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      this.rl = readline.createInterface({
        input: this.process.stdout!,
        terminal: false,
      });

      this.rl.on('line', (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        try {
          const response = JSON.parse(trimmed) as JsonRpcResponse;
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        } catch {
          // ignore non-JSON lines
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        // MCP server logs go to stderr — just log them
        process.stderr.write(`[MCP-stdio] ${data.toString()}`);
      });

      this.process.on('exit', (code) => {
        this.emit('disconnect', code);
      });

      this.process.on('error', (err) => {
        reject(err);
      });

      // Give the process a moment to start up
      setTimeout(() => resolve(), 500);
    });
  }

  async send(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP stdio transport not connected');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out after 30s`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  disconnect(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
