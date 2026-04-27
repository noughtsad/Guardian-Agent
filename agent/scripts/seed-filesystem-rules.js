import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.env.DB_PATH || './data/armoriq.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.resolve('./src/db/schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

const existingRules = new Map(
  db
    .prepare('SELECT id, name, tool_pattern FROM rules')
    .all()
    .map((row) => [row.tool_pattern, row]),
);

const now = new Date().toISOString();
const desiredRules = [
  {
    name: 'Block filesystem write_file',
    toolPattern: 'filesystem/write_file',
    priority: 100,
  },
  {
    name: 'Block filesystem delete_file',
    toolPattern: 'filesystem/delete_file',
    priority: 100,
  },
  {
    name: 'Block filesystem create_directory',
    toolPattern: 'filesystem/create_directory',
    priority: 90,
  },
];

const insert = db.prepare(`
  INSERT INTO rules (id, name, enabled, priority, rule_type, tool_pattern, condition, transform_fn, timeout_sec, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;

for (const rule of desiredRules) {
  if (existingRules.has(rule.toolPattern)) {
    continue;
  }

  insert.run(
    randomUUID(),
    rule.name,
    1,
    rule.priority,
    'BLOCK',
    rule.toolPattern,
    null,
    null,
    120,
    now,
    now,
  );

  insertedCount += 1;
}

console.log(
  JSON.stringify({
    dbPath,
    insertedCount,
    totalFilesystemRules: db
      .prepare("SELECT COUNT(*) AS count FROM rules WHERE tool_pattern LIKE 'filesystem/%'")
      .get().count,
  }),
);

db.close();
