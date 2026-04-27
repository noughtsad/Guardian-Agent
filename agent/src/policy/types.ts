// ── Rule Types ──────────────────────────────────────────────────
export type RuleType = 'BLOCK' | 'REQUIRE_APPROVAL' | 'INPUT_VALIDATION' | 'TRANSFORM';

export interface RuleCondition {
  field: string;           // e.g. "input.path"
  operator: 'contains' | 'startsWith' | 'matches' | 'equals';
  value: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;        // lower = higher precedence
  ruleType: RuleType;
  toolPattern: string;     // glob or exact tool name
  condition?: RuleCondition;
  transformFn?: string;    // serialised JS expression
  timeoutSeconds?: number; // for REQUIRE_APPROVAL, default 120
  createdAt: string;
  updatedAt: string;
}

// ── Tool Types ──────────────────────────────────────────────────
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  serverName: string;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema
}

// ── Message Types ───────────────────────────────────────────────
export type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

// ── Token Usage ─────────────────────────────────────────────────
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// ── Policy Decision ─────────────────────────────────────────────
export type PolicyDecision =
  | { action: 'ALLOW' }
  | { action: 'BLOCK'; reason: string }
  | { action: 'REQUIRE_APPROVAL'; ruleId: string; timeoutSeconds: number }
  | { action: 'TRANSFORM'; transformedCall: ToolCall };

// ── LLM Response ────────────────────────────────────────────────
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
}

// ── WebSocket Event Types ───────────────────────────────────────
export type WSEvent =
  | { type: 'RULES_UPDATED'; rules: Rule[] }
  | { type: 'APPROVAL_REQUESTED'; approvalId: string; toolCall: ToolCall; timeoutSeconds: number }
  | { type: 'APPROVAL_RESOLVED'; approvalId: string; outcome: 'approved' | 'rejected' }
  | { type: 'TOOL_EXECUTED'; conversationId: string; toolName: string; blocked: boolean }
  | { type: 'AGENT_TURN'; conversationId: string; role: string; content: string };

// ── Approval Request ────────────────────────────────────────────
export interface ApprovalRequest {
  id: string;
  toolCall: ToolCall;
  timeoutSeconds: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'timed_out';
}

// ── Audit Log ───────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  eventType: string;
  toolName?: string;
  ruleId?: string;
  detail?: string;
  createdAt: string;
}

// ── Conversation ────────────────────────────────────────────────
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

export interface Conversation {
  id: string;
  lastMessage: string;
  turnCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  createdAt: string;
  updatedAt: string;
}
