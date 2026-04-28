import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: Database.Database | null = null;

function resolveSchemaPath(): string {
  const candidatePaths = [
    path.join(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Database schema file not found. Checked: ${candidatePaths.join(', ')}`);
}

export function getDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || './data/armoriq.db';
  const absoluteDbPath = path.resolve(dbPath);

  // Ensure the directory exists
  const dir = path.dirname(absoluteDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(absoluteDbPath);

  // Enable WAL mode for better concurrent read performance
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Run schema migrations
  const schemaPath = resolveSchemaPath();
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  dbInstance.exec(schema);

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
