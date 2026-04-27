import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File-based SQLite — persists across restarts and can be viewed externally
const dbPath = process.env.MCP_DB_PATH || path.resolve(__dirname, '../../data/store.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
process.stderr.write(`[MCP Store] Using database: ${dbPath}\n`);


// Create the collections meta-table and a generic records table
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id          TEXT NOT NULL,
    collection  TEXT NOT NULL,
    data        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
`);

export interface StoredRecord {
  id: string;
  collection: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function createRecord(collection: string, data: Record<string, unknown>): StoredRecord {
  const id = uuidv4();
  const now = new Date().toISOString();
  const record: StoredRecord = { id, collection, data, createdAt: now, updatedAt: now };

  db.prepare(
    'INSERT INTO records (id, collection, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, collection, JSON.stringify(data), now, now);

  return record;
}

export function readRecord(collection: string, id: string): StoredRecord | null {
  const row = db.prepare(
    'SELECT * FROM records WHERE collection = ? AND id = ?'
  ).get(collection, id) as any;

  if (!row) return null;
  return mapRow(row);
}

export function updateRecord(collection: string, id: string, patch: Record<string, unknown>): StoredRecord | null {
  const existing = readRecord(collection, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newData = { ...existing.data, ...patch };

  db.prepare(
    'UPDATE records SET data = ?, updated_at = ? WHERE collection = ? AND id = ?'
  ).run(JSON.stringify(newData), now, collection, id);

  return { ...existing, data: newData, updatedAt: now };
}

export function deleteRecord(collection: string, id: string): boolean {
  const result = db.prepare(
    'DELETE FROM records WHERE collection = ? AND id = ?'
  ).run(collection, id);
  return result.changes > 0;
}

export function listRecords(
  collection: string,
  filter?: Record<string, unknown>,
  limit?: number
): StoredRecord[] {
  let rows: any[];

  if (limit) {
    rows = db.prepare(
      'SELECT * FROM records WHERE collection = ? ORDER BY created_at DESC LIMIT ?'
    ).all(collection, limit) as any[];
  } else {
    rows = db.prepare(
      'SELECT * FROM records WHERE collection = ? ORDER BY created_at DESC'
    ).all(collection) as any[];
  }

  let records = rows.map(mapRow);

  // Apply filter if provided
  if (filter && Object.keys(filter).length > 0) {
    records = records.filter(record => {
      return Object.entries(filter).every(([key, value]) => {
        return record.data[key] === value;
      });
    });
  }

  return records;
}

function mapRow(row: any): StoredRecord {
  return {
    id: row.id,
    collection: row.collection,
    data: JSON.parse(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
