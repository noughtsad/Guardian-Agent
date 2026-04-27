import { RuleRepository } from './RuleRepository.js';
import { evaluate } from './PolicyEvaluator.js';
import { ApprovalQueue } from './ApprovalQueue.js';
import type { ToolCall, PolicyDecision, Rule } from './types.js';

type BroadcastFn = (event: any) => void;

export class PolicyEngine {
  private ruleRepository: RuleRepository;
  private approvalQueue: ApprovalQueue;
  private cachedRules: Rule[] = [];

  constructor(broadcast: BroadcastFn) {
    this.ruleRepository = new RuleRepository();
    this.approvalQueue = new ApprovalQueue(broadcast);

    // Load initial rules into cache
    this.refreshCache();

    // Subscribe to rule changes for live updates
    this.ruleRepository.on('rules:changed', () => {
      this.refreshCache();
    });
  }

  private refreshCache(): void {
    this.cachedRules = this.ruleRepository.findAll();
  }

  /**
   * Evaluate a tool call against all active rules.
   */
  evaluate(toolCall: ToolCall): PolicyDecision {
    return evaluate(toolCall, this.cachedRules);
  }

  /**
   * Get the approval queue for managing pending approvals.
   */
  getApprovalQueue(): ApprovalQueue {
    return this.approvalQueue;
  }

  /**
   * Get the rule repository for CRUD operations.
   */
  getRuleRepository(): RuleRepository {
    return this.ruleRepository;
  }

  /**
   * Get all cached rules (used for WS broadcasts).
   */
  getRules(): Rule[] {
    return this.cachedRules;
  }
}
