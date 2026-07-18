/**
 * Applies SQL migrations from db/migrations/ to the SQLite database at
 * DATABASE_PATH. Migrations are generated via `npm run db:generate`
 * (drizzle-kit) and are safe to re-run — already-applied migrations are
 * tracked in a __drizzle_migrations table and skipped automatically.
 */
import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

async function main() {
  const dbPath = process.env.DATABASE_PATH || './data/nexus.db'
  const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)
  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const migrationsFolder = path.join(process.cwd(), 'db', 'migrations')
  if (!fs.existsSync(migrationsFolder)) {
    console.log(`[migrate] No migrations folder found at ${migrationsFolder} — run "npm run db:generate" first.`)
    process.exit(0)
  }

  const sqlite = new Database(resolvedPath)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite)

  console.log(`[migrate] Applying migrations from ${migrationsFolder} to ${resolvedPath} ...`)
  migrate(db, { migrationsFolder })
  console.log('[migrate] Done.')
  sqlite.close()
}

main().catch((err) => {
  console.error('[migrate] Failed:', err)
  process.exit(1)
})
