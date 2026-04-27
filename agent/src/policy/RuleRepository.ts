import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/Database.js';
import type { Rule, RuleCondition } from './types.js';

export class RuleRepository extends EventEmitter {
  constructor() {
    super();
  }

  create(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Rule {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = uuidv4();

    const newRule: Rule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = db.prepare(`
      INSERT INTO rules (id, name, enabled, priority, rule_type, tool_pattern, condition, transform_fn, timeout_sec, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newRule.id,
      newRule.name,
      newRule.enabled ? 1 : 0,
      newRule.priority,
      newRule.ruleType,
      newRule.toolPattern,
      newRule.condition ? JSON.stringify(newRule.condition) : null,
      newRule.transformFn || null,
      newRule.timeoutSeconds || 120,
      newRule.createdAt,
      newRule.updatedAt,
    );

    this.emit('rules:changed');
    return newRule;
  }

  update(id: string, patch: Partial<Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>>): Rule | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const db = getDatabase();
    const now = new Date().toISOString();

    const updated: Rule = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    const stmt = db.prepare(`
      UPDATE rules SET
        name = ?, enabled = ?, priority = ?, rule_type = ?, tool_pattern = ?,
        condition = ?, transform_fn = ?, timeout_sec = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.enabled ? 1 : 0,
      updated.priority,
      updated.ruleType,
      updated.toolPattern,
      updated.condition ? JSON.stringify(updated.condition) : null,
      updated.transformFn || null,
      updated.timeoutSeconds || 120,
      updated.updatedAt,
      updated.id,
    );

    this.emit('rules:changed');
    return updated;
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM rules WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes > 0) {
      this.emit('rules:changed');
      return true;
    }
    return false;
  }

  findAll(): Rule[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM rules ORDER BY priority ASC').all() as any[];
    return rows.map(this.mapRow);
  }

  findById(id: string): Rule | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  private mapRow(row: any): Rule {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled === 1,
      priority: row.priority,
      ruleType: row.rule_type,
      toolPattern: row.tool_pattern,
      condition: row.condition ? JSON.parse(row.condition) as RuleCondition : undefined,
      transformFn: row.transform_fn || undefined,
      timeoutSeconds: row.timeout_sec,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
