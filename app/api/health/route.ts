import { rawSqlite } from '@/db/client'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'

/**
 * GET /api/health
 * Public liveness/readiness probe. Intentionally unauthenticated so
 * load balancers, uptime monitors, and container orchestrators can hit
 * it without credentials. Verifies the SQLite connection is alive.
 */
export const GET = withErrorHandling(async () => {
  const dbOk = (() => {
    try {
      rawSqlite.prepare('SELECT 1').get()
      return true
    } catch {
      return false
    }
  })()

  return apiSuccess({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'unreachable',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  })
})
