/**
 * Seed script — populates the MCP server's SQLite store with demo data.
 *
 * Run with:
 *   node --experimental-vm-modules scripts/seed.mjs
 *   OR (after building):
 *   node dist/scripts/seed.js
 *
 * Easiest: npx tsx scripts/seed.ts
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/store.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

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

const now = new Date().toISOString();

function insert(collection: string, data: object): string {
  const id = uuidv4();
  db.prepare(
    'INSERT OR REPLACE INTO records (id, collection, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, collection, JSON.stringify({ ...data, id }), now, now);
  return id;
}

// ── Users ──────────────────────────────────────────────────────
const userIds = [
  insert('users', { name: 'Alice Johnson',  email: 'alice@example.com',  role: 'admin',   status: 'active',   age: 34, department: 'Engineering' }),
  insert('users', { name: 'Bob Smith',       email: 'bob@example.com',    role: 'editor',  status: 'active',   age: 28, department: 'Marketing'   }),
  insert('users', { name: 'Carol White',     email: 'carol@example.com',  role: 'viewer',  status: 'inactive', age: 41, department: 'Sales'        }),
  insert('users', { name: 'David Lee',       email: 'david@example.com',  role: 'editor',  status: 'active',   age: 25, department: 'Engineering' }),
  insert('users', { name: 'Eva Martinez',    email: 'eva@example.com',    role: 'admin',   status: 'active',   age: 38, department: 'HR'           }),
];

// ── Products ───────────────────────────────────────────────────
const productIds = [
  insert('products', { name: 'ArmorIQ Pro',    category: 'Software',  price: 299,  stock: 999, sku: 'AQ-PRO-001', status: 'active'      }),
  insert('products', { name: 'ArmorIQ Basic',  category: 'Software',  price: 99,   stock: 999, sku: 'AQ-BSC-001', status: 'active'      }),
  insert('products', { name: 'Security Audit', category: 'Service',   price: 1500, stock: 10,  sku: 'SVC-AUD-001', status: 'active'     }),
  insert('products', { name: 'Legacy Shield',  category: 'Software',  price: 49,   stock: 50,  sku: 'AQ-LEG-001', status: 'deprecated' }),
  insert('products', { name: 'API Gateway',    category: 'Hardware',  price: 899,  stock: 25,  sku: 'HW-GW-001',  status: 'active'      }),
];

// ── Orders ─────────────────────────────────────────────────────
insert('orders', { userId: userIds[0], productId: productIds[0], quantity: 2, total: 598,  status: 'completed', paymentMethod: 'card'   });
insert('orders', { userId: userIds[1], productId: productIds[1], quantity: 1, total: 99,   status: 'pending',   paymentMethod: 'invoice' });
insert('orders', { userId: userIds[2], productId: productIds[2], quantity: 1, total: 1500, status: 'completed', paymentMethod: 'wire'   });
insert('orders', { userId: userIds[3], productId: productIds[0], quantity: 3, total: 897,  status: 'processing',paymentMethod: 'card'   });
insert('orders', { userId: userIds[4], productId: productIds[4], quantity: 1, total: 899,  status: 'shipped',   paymentMethod: 'card'   });
insert('orders', { userId: userIds[0], productId: productIds[1], quantity: 5, total: 495,  status: 'completed', paymentMethod: 'invoice' });

// ── Support Tickets ────────────────────────────────────────────
insert('tickets', { userId: userIds[1], subject: 'Cannot login',            priority: 'high',   status: 'open',     assignee: 'Alice Johnson'  });
insert('tickets', { userId: userIds[2], subject: 'Billing discrepancy',     priority: 'medium', status: 'open',     assignee: 'Eva Martinez'   });
insert('tickets', { userId: userIds[3], subject: 'Feature request: MFA',    priority: 'low',    status: 'closed',   assignee: 'David Lee'      });
insert('tickets', { userId: userIds[0], subject: 'API rate limit too low',  priority: 'high',   status: 'open',     assignee: 'David Lee'      });
insert('tickets', { userId: userIds[4], subject: 'Password reset not working', priority: 'high', status: 'resolved', assignee: 'Alice Johnson' });

const collected = db.prepare(`
  SELECT collection, COUNT(*) as cnt FROM records GROUP BY collection
`).all() as { collection: string; cnt: number }[];

console.log('\n✅ Demo data seeded successfully!\n');
console.table(collected.reduce((acc: any, row) => {
  acc[row.collection] = row.cnt + ' records';
  return acc;
}, {}));
console.log(`\n📂 Database: ${dbPath}\n`);
