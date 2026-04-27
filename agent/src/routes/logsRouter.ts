import { Router, type Request, type Response } from 'express';
import { AuditLogger } from '../db/AuditLogger.js';

export function createLogsRouter(): Router {
  const router = Router();
  const auditLogger = new AuditLogger();

  // GET /api/logs — List audit logs
  router.get('/', (_req: Request, res: Response) => {
    const logs = auditLogger.getAll();
    res.json(logs);
  });

  return router;
}
