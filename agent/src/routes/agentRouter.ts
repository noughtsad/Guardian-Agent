import { Router, type Request, type Response } from 'express';
import type { AgentRunner } from '../agent/AgentRunner.js';
import type { PolicyEngine } from '../policy/PolicyEngine.js';

export function createAgentRouter(agentRunner: AgentRunner, policyEngine: PolicyEngine): Router {
  const router = Router();

  // POST /api/agent/chat — Send a message to the agent
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required and must be a string' });
        return;
      }

      const result = await agentRunner.run(message, conversationId);
      res.json(result);
    } catch (err: any) {
      console.error('[AgentRouter] Chat error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // GET /api/conversations — List all conversations
  router.get('/conversations', (_req: Request, res: Response) => {
    const conversations = agentRunner.getConversationStore().listConversations();
    res.json(conversations);
  });

  // GET /api/conversations/:id/turns — Get turns for a conversation
  router.get('/conversations/:id/turns', (req: Request, res: Response) => {
    const turns = agentRunner.getConversationStore().getTurns(req.params.id as string);
    res.json(turns);
  });

  // POST /api/approvals/:id/approve — Approve a pending tool call
  router.post('/approvals/:id/approve', (req: Request, res: Response) => {
    const approved = policyEngine.getApprovalQueue().approve(req.params.id as string);
    if (!approved) {
      res.status(404).json({ error: 'Approval request not found or already resolved' });
      return;
    }
    res.json({ ok: true });
  });

  // POST /api/approvals/:id/reject — Reject a pending tool call
  router.post('/approvals/:id/reject', (req: Request, res: Response) => {
    const reason = req.body.reason || 'Rejected by admin';
    const rejected = policyEngine.getApprovalQueue().reject(req.params.id as string, reason);
    if (!rejected) {
      res.status(404).json({ error: 'Approval request not found or already resolved' });
      return;
    }
    res.json({ ok: true });
  });

  // GET /api/approvals/pending — List pending approvals
  router.get('/approvals/pending', (_req: Request, res: Response) => {
    const pending = policyEngine.getApprovalQueue().getPending();
    res.json(pending);
  });

  return router;
}
