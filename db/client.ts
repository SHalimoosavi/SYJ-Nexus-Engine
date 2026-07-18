import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import * as schema from './schema'

const dbPath = process.env.DATABASE_PATH || './data/nexus.db'
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)

// Ensure the containing directory exists (init.sh also does this, but this
// makes the module safe to import in any context, e.g. tests).
const dir = path.dirname(resolvedPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const sqlite = new Database(resolvedPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export const rawSqlite = sqlite
