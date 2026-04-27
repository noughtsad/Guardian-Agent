import { EventEmitter } from 'events';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

export class MCPSSETransport extends EventEmitter {
  private url: string;
  private apiKey?: string;
  private requestId = 0;
  private connected = false;
  private eventSource: any = null; // Will use fetch-based SSE

  constructor(url: string, apiKey?: string) {
    super();
    this.url = url;
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    this.connected = true;
    // SSE connections to remote MCP servers are established on-demand
    // The actual connection happens when we send the first request
  }

  async send(method: string, params?: any): Promise<any> {
    if (!this.connected) {
      throw new Error('MCP SSE transport not connected');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`MCP SSE request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'MCP server error');
      }

      return data.result;
    } catch (err) {
      if (err instanceof Error && err.message.includes('fetch')) {
        this.emit('disconnect', err);
      }
      throw err;
    }
  }

  disconnect(): void {
    this.connected = false;
    if (this.eventSource) {
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
