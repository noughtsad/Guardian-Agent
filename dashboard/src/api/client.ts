const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ── Types ──────────────────────────────────────────────
export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  ruleType: 'BLOCK' | 'REQUIRE_APPROVAL' | 'INPUT_VALIDATION' | 'TRANSFORM';
  toolPattern: string;
  condition?: { field: string; operator: string; value: string };
  transformFn?: string;
  timeoutSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  lastMessage: string;
  turnCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  role: string;
  content?: string;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  tokensIn: number;
  tokensOut: number;
  blocked: boolean;
  blockReason?: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  toolCall: { id: string; name: string; input: Record<string, unknown>; serverName: string };
  timeoutSeconds: number;
  createdAt: string;
  status: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  toolName?: string;
  ruleId?: string;
  detail?: any;
  createdAt: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
}

// ── API Methods ────────────────────────────────────────
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

// Rules
export const api = {
  getRules: () => fetchJson<Rule[]>('/api/rules'),
  createRule: (rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetchJson<Rule>('/api/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateRule: (id: string, patch: Partial<Rule>) =>
    fetchJson<Rule>(`/api/rules/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteRule: (id: string) =>
    fetchJson<{ deleted: boolean }>(`/api/rules/${id}`, { method: 'DELETE' }),
  toggleRule: (id: string, enabled: boolean) =>
    fetchJson<Rule>(`/api/rules/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  // Agent
  chat: (message: string, conversationId?: string) =>
    fetchJson<ChatResponse>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    }),

  // Conversations
  getConversations: () => fetchJson<Conversation[]>('/api/conversations'),
  getConversationTurns: (id: string) => fetchJson<ConversationTurn[]>(`/api/conversations/${id}/turns`),

  // Approvals
  getPendingApprovals: () => fetchJson<ApprovalRequest[]>('/api/approvals/pending'),
  approveRequest: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/approvals/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id: string, reason: string) =>
    fetchJson<{ ok: boolean }>(`/api/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Logs
  getLogs: () => fetchJson<AuditLog[]>('/api/logs'),
};
