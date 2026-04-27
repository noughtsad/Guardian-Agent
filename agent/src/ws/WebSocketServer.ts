import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';

export class WebSocketManager {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[WebSocket] Client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast an event to all connected dashboard clients.
   */
  broadcast(event: any): void {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Get the broadcast function (for passing to other modules).
   */
  getBroadcast(): (event: any) => void {
    return this.broadcast.bind(this);
  }
}
