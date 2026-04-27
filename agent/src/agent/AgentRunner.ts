import { v4 as uuidv4 } from 'uuid';
import { LLMClient } from './LLMClient.js';
import { ConversationStore } from './ConversationStore.js';
import { MCPClientManager } from '../mcp/MCPClientManager.js';
import { PolicyEngine } from '../policy/PolicyEngine.js';
import { AuditLogger } from '../db/AuditLogger.js';
import type { Message, ToolCall, TokenUsage } from '../policy/types.js';

type BroadcastFn = (event: any) => void;

const MAX_ITERATIONS = 10;

// Cost per million tokens for Gemini (approximate)
const COST_PER_M_INPUT = 0.15;   // Gemini 2.5 Flash
const COST_PER_M_OUTPUT = 0.60;

export class AgentRunner {
  private llmClient: LLMClient;
  private conversationStore: ConversationStore;
  private mcpManager: MCPClientManager;
  private policyEngine: PolicyEngine;
  private auditLogger: AuditLogger;
  private broadcast: BroadcastFn;

  constructor(
    mcpManager: MCPClientManager,
    policyEngine: PolicyEngine,
    broadcast: BroadcastFn,
  ) {
    this.llmClient = new LLMClient();
    this.conversationStore = new ConversationStore();
    this.mcpManager = mcpManager;
    this.policyEngine = policyEngine;
    this.auditLogger = new AuditLogger();
    this.broadcast = broadcast;
  }

  async run(userMessage: string, conversationId?: string): Promise<{
    reply: string;
    conversationId: string;
    usage: TokenUsage;
  }> {
    const convId = conversationId || uuidv4();
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    // Load history and append user message
    const history = this.conversationStore.getHistory(convId);
    const messages: Message[] = history.map(turn => {
      if (turn.role === 'user') {
        return { role: 'user' as const, content: turn.content || '' };
      } else if (turn.role === 'assistant') {
        return { role: 'assistant' as const, content: turn.content || null };
      } else {
        return { role: 'tool' as const, toolCallId: turn.id, content: turn.toolResult || turn.content || '' };
      }
    });

    messages.push({ role: 'user', content: userMessage });

    // Log user turn
    this.conversationStore.append({
      conversationId: convId,
      role: 'user',
      content: userMessage,
      tokensIn: 0,
      tokensOut: 0,
      blocked: false,
    });

    this.broadcast({
      type: 'AGENT_TURN',
      conversationId: convId,
      role: 'user',
      content: userMessage,
    });

    // Tool-use loop
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Re-fetch tools each iteration (never cache between turns)
      const tools = this.mcpManager.getToolRegistry().getAll();

      // Call LLM
      const response = await this.llmClient.chat(messages, tools);

      totalTokensIn += response.usage.inputTokens;
      totalTokensOut += response.usage.outputTokens;

      // If no tool calls, this is the final answer
      if (!response.toolCalls || response.toolCalls.length === 0) {
        const reply = response.content || 'No response from model';

        this.conversationStore.append({
          conversationId: convId,
          role: 'assistant',
          content: reply,
          tokensIn: response.usage.inputTokens,
          tokensOut: response.usage.outputTokens,
          blocked: false,
        });

        this.broadcast({
          type: 'AGENT_TURN',
          conversationId: convId,
          role: 'assistant',
          content: reply,
        });

        return {
          reply,
          conversationId: convId,
          usage: this.calculateCost(totalTokensIn, totalTokensOut),
        };
      }

      // Process tool calls
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      };
      messages.push(assistantMessage);

      // Log assistant turn with tool calls
      this.conversationStore.append({
        conversationId: convId,
        role: 'assistant',
        content: response.content || `[Tool calls: ${response.toolCalls.map(t => t.name).join(', ')}]`,
        tokensIn: response.usage.inputTokens,
        tokensOut: response.usage.outputTokens,
        blocked: false,
      });

      for (const toolCall of response.toolCalls) {
        // Resolve server name from registry
        const serverName = this.mcpManager.getToolRegistry().getServerForTool(toolCall.name);
        toolCall.serverName = serverName || 'unknown';

        // Policy evaluation — MUST intercept here
        const decision = this.policyEngine.evaluate(toolCall);

        let toolResultContent: string;
        let wasBlocked = false;
        let blockReason: string | undefined;

        switch (decision.action) {
          case 'BLOCK': {
            toolResultContent = JSON.stringify({ error: `Blocked by policy: ${decision.reason}` });
            wasBlocked = true;
            blockReason = decision.reason;

            // Log to audit
            this.auditLogger.log('BLOCK', toolCall.name, undefined, {
              toolCall,
              reason: decision.reason,
            });

            // Check for injection attempt
            if (decision.reason.includes('injection')) {
              this.auditLogger.log('INJECTION_ATTEMPT', toolCall.name, undefined, {
                toolCall,
                rawInput: JSON.stringify(toolCall.input),
              });
            }
            break;
          }

          case 'REQUIRE_APPROVAL': {
            const approvalResult = await this.policyEngine.getApprovalQueue()
              .waitForApproval(toolCall, decision.timeoutSeconds);

            if (approvalResult.content === '__APPROVED__') {
              // Execute the tool after approval
              const executionResult = await this.mcpManager.executeTool(toolCall);
              toolResultContent = executionResult.content;

              this.auditLogger.log('APPROVAL_GRANTED', toolCall.name, decision.ruleId, {
                toolCall,
              });
            } else {
              toolResultContent = approvalResult.content;
              wasBlocked = true;
              blockReason = approvalResult.content;

              this.auditLogger.log('APPROVAL_REJECTED', toolCall.name, decision.ruleId, {
                toolCall,
                reason: approvalResult.content,
              });
            }
            break;
          }

          case 'TRANSFORM': {
            const transformedResult = await this.mcpManager.executeTool(decision.transformedCall);
            toolResultContent = transformedResult.content;
            break;
          }

          case 'ALLOW':
          default: {
            const result = await this.mcpManager.executeTool(toolCall);
            toolResultContent = result.content;
            break;
          }
        }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: toolResultContent,
        });

        // Log tool turn
        this.conversationStore.append({
          conversationId: convId,
          role: 'tool',
          content: toolResultContent,
          toolName: toolCall.name,
          toolInput: JSON.stringify(toolCall.input),
          toolResult: toolResultContent,
          tokensIn: 0,
          tokensOut: 0,
          blocked: wasBlocked,
          blockReason,
        });

        this.broadcast({
          type: 'TOOL_EXECUTED',
          conversationId: convId,
          toolName: toolCall.name,
          blocked: wasBlocked,
        });
      }
    }

    // Max iterations reached
    const maxIterMsg = 'Max tool iterations reached. Please try a simpler request.';

    this.conversationStore.append({
      conversationId: convId,
      role: 'assistant',
      content: maxIterMsg,
      tokensIn: 0,
      tokensOut: 0,
      blocked: false,
    });

    return {
      reply: maxIterMsg,
      conversationId: convId,
      usage: this.calculateCost(totalTokensIn, totalTokensOut),
    };
  }

  private calculateCost(tokensIn: number, tokensOut: number): TokenUsage {
    return {
      inputTokens: tokensIn,
      outputTokens: tokensOut,
      estimatedCostUsd: (tokensIn / 1_000_000) * COST_PER_M_INPUT + (tokensOut / 1_000_000) * COST_PER_M_OUTPUT,
    };
  }

  getConversationStore(): ConversationStore {
    return this.conversationStore;
  }
}
