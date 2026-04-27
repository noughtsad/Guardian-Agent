import { v4 as uuidv4 } from 'uuid';
import type { ToolCall, ToolResult, ApprovalRequest } from './types.js';

type BroadcastFn = (event: any) => void;

interface PendingApproval {
  resolve: (result: ToolResult) => void;
  reject: (result: ToolResult) => void;
  timer: ReturnType<typeof setTimeout>;
  request: ApprovalRequest;
}

export class ApprovalQueue {
  private pending: Map<string, PendingApproval> = new Map();
  private broadcast: BroadcastFn;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
  }

  /**
   * Creates a pending approval and returns a promise that resolves when
   * the admin approves or rejects (or times out).
   */
  waitForApproval(toolCall: ToolCall, timeoutSeconds: number = 120): Promise<ToolResult> {
    const approvalId = uuidv4();

    return new Promise<ToolResult>((resolve, reject) => {
      const request: ApprovalRequest = {
        id: approvalId,
        toolCall,
        timeoutSeconds,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      // Start timeout timer
      const timer = setTimeout(() => {
        const entry = this.pending.get(approvalId);
        if (entry) {
          entry.request.status = 'timed_out';
          this.pending.delete(approvalId);
          this.broadcast({
            type: 'APPROVAL_RESOLVED',
            approvalId,
            outcome: 'rejected',
          });
          resolve({
            toolCallId: toolCall.id,
            content: 'Approval timed out — approver offline',
            isError: true,
          });
        }
      }, timeoutSeconds * 1000);

      this.pending.set(approvalId, { resolve, reject, timer, request });

      // Broadcast approval request to dashboard
      this.broadcast({
        type: 'APPROVAL_REQUESTED',
        approvalId,
        toolCall,
        timeoutSeconds,
      });
    });
  }

  /**
   * Admin approves the pending tool call.
   */
  approve(approvalId: string): boolean {
    const entry = this.pending.get(approvalId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    entry.request.status = 'approved';
    this.pending.delete(approvalId);

    this.broadcast({
      type: 'APPROVAL_RESOLVED',
      approvalId,
      outcome: 'approved',
    });

    // Resolve with a marker that tells AgentRunner to proceed with execution
    entry.resolve({
      toolCallId: entry.request.toolCall.id,
      content: '__APPROVED__',
      isError: false,
    });

    return true;
  }

  /**
   * Admin rejects the pending tool call.
   */
  reject(approvalId: string, reason: string = 'Rejected by admin'): boolean {
    const entry = this.pending.get(approvalId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    entry.request.status = 'rejected';
    this.pending.delete(approvalId);

    this.broadcast({
      type: 'APPROVAL_RESOLVED',
      approvalId,
      outcome: 'rejected',
    });

    entry.resolve({
      toolCallId: entry.request.toolCall.id,
      content: `Rejected by admin: ${reason}`,
      isError: true,
    });

    return true;
  }

  /**
   * Returns all currently pending approval requests.
   */
  getPending(): ApprovalRequest[] {
    return Array.from(this.pending.values()).map(p => p.request);
  }
}
