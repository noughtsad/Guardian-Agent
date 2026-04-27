import { useEffect, useRef, useCallback } from 'react';
import { useRuleStore } from '../store/ruleStore';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { setRules, addApproval, removeApproval } = useRuleStore();

  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'RULES_UPDATED':
            setRules(data.rules);
            break;
          case 'APPROVAL_REQUESTED':
            addApproval({
              id: data.approvalId,
              toolCall: data.toolCall,
              timeoutSeconds: data.timeoutSeconds,
              createdAt: new Date().toISOString(),
              status: 'pending',
            });
            break;
          case 'APPROVAL_RESOLVED':
            removeApproval(data.approvalId);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [setRules, addApproval, removeApproval]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
