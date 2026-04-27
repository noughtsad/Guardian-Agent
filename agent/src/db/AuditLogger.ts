import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './Database.js';

export class AuditLogger {
  log(eventType: string, toolName?: string, ruleId?: string, detail?: any): void {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (id, event_type, tool_name, rule_id, detail, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      eventType,
      toolName || null,
      ruleId || null,
      detail ? JSON.stringify(detail) : null,
      now,
    );
  }

  getAll(): any[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200'
    ).all() as any[];

    return rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      toolName: row.tool_name,
      ruleId: row.rule_id,
      detail: row.detail ? JSON.parse(row.detail) : null,
      createdAt: row.created_at,
    }));
  }
}
