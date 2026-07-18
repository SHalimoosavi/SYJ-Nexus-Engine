/**
 * Idempotent programmatic init step, invoked by init.sh via `npm run init`.
 * Creates the data directory, applies migrations, and seeds baseline data.
 * Safe to run multiple times.
 */
import 'dotenv/config'
import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

function run(cmd: string) {
  console.log(`[init] $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function main() {
  const dbPath = process.env.DATABASE_PATH || './data/nexus.db'
  const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)
  const dir = path.dirname(resolvedPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`[init] Created data directory at ${dir}`)
  }

  const migrationsFolder = path.join(process.cwd(), 'db', 'migrations')
  if (!fs.existsSync(migrationsFolder) || fs.readdirSync(migrationsFolder).length === 0) {
    console.log('[init] No migrations found — generating from schema...')
    run('npx drizzle-kit generate')
  }

  console.log('[init] Applying migrations...')
  run('npx tsx scripts/migrate.ts')

  console.log('[init] Seeding baseline data...')
  run('npx tsx scripts/seed.ts')

  console.log('[init] Verifying installation...')
  run('npx tsx scripts/health-check.ts')

  console.log('[init] Initialization complete.')
}

main()
