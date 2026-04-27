import { Router, type Request, type Response } from 'express';
import type { PolicyEngine } from '../policy/PolicyEngine.js';

type BroadcastFn = (event: any) => void;

export function createRulesRouter(policyEngine: PolicyEngine, broadcast: BroadcastFn): Router {
  const router = Router();
  const ruleRepo = policyEngine.getRuleRepository();

  // GET /api/rules — List all rules
  router.get('/', (_req: Request, res: Response) => {
    const rules = ruleRepo.findAll();
    res.json(rules);
  });

  // POST /api/rules — Create a new rule
  router.post('/', (req: Request, res: Response) => {
    try {
      // Validate transformFn if provided
      if (req.body.transformFn) {
        try {
          new Function('input', 'toolCall', req.body.transformFn);
        } catch (err: any) {
          res.status(400).json({ error: `Invalid transform expression: ${err.message}` });
          return;
        }
      }

      const rule = ruleRepo.create({
        name: req.body.name,
        enabled: req.body.enabled !== false,
        priority: req.body.priority || 100,
        ruleType: req.body.ruleType,
        toolPattern: req.body.toolPattern,
        condition: req.body.condition,
        transformFn: req.body.transformFn,
        timeoutSeconds: req.body.timeoutSeconds || 120,
      });

      broadcast({ type: 'RULES_UPDATED', rules: ruleRepo.findAll() });
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // PATCH /api/rules/:id — Update a rule
  router.patch('/:id', (req: Request, res: Response) => {
    try {
      if (req.body.transformFn) {
        try {
          new Function('input', 'toolCall', req.body.transformFn);
        } catch (err: any) {
          res.status(400).json({ error: `Invalid transform expression: ${err.message}` });
          return;
        }
      }

      const rule = ruleRepo.update(req.params.id as string, req.body);
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      broadcast({ type: 'RULES_UPDATED', rules: ruleRepo.findAll() });
      res.json(rule);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/rules/:id — Delete a rule
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = ruleRepo.delete(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    broadcast({ type: 'RULES_UPDATED', rules: ruleRepo.findAll() });
    res.json({ deleted: true });
  });

  // PATCH /api/rules/:id/toggle — Toggle rule enabled/disabled
  router.patch('/:id/toggle', (req: Request, res: Response) => {
    const rule = ruleRepo.update(req.params.id as string, { enabled: req.body.enabled });
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    broadcast({ type: 'RULES_UPDATED', rules: ruleRepo.findAll() });
    res.json(rule);
  });

  return router;
}
