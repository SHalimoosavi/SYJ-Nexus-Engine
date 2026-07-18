/**
 * Standalone CLI health check — verifies the DB file exists and responds,
 * and that the vertical registry parses. Used by `npm run health` and by
 * init.sh's post-install verification step. Exits non-zero on failure so
 * it can be used in CI or process supervisors.
 */
import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'

function checkDatabase(): boolean {
  const dbPath = process.env.DATABASE_PATH || './data/nexus.db'
  const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)

  if (!fs.existsSync(resolvedPath)) {
    console.error(`[health] Database file not found at ${resolvedPath}`)
    return false
  }

  try {
    const sqlite = new Database(resolvedPath, { readonly: true })
    sqlite.prepare('SELECT 1').get()
    sqlite.close()
    console.log(`[health] Database OK at ${resolvedPath}`)
    return true
  } catch (err) {
    console.error('[health] Database check failed:', err)
    return false
  }
}

function checkRegistry(): boolean {
  const registryPath = path.join(process.cwd(), 'registry', 'vertical-registry.json')
  try {
    const raw = fs.readFileSync(registryPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.verticals) || parsed.verticals.length === 0) {
      console.error('[health] vertical-registry.json has no verticals')
      return false
    }
    console.log(`[health] Registry OK — ${parsed.verticals.length} verticals`)
    return true
  } catch (err) {
    console.error('[health] Registry check failed:', err)
    return false
  }
}

function main() {
  const dbOk = checkDatabase()
  const registryOk = checkRegistry()

  if (dbOk && registryOk) {
    console.log('[health] All checks passed.')
    process.exit(0)
  } else {
    console.error('[health] One or more checks failed.')
    process.exit(1)
  }
}

main()
