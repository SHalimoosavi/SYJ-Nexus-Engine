import { NextRequest } from 'next/server'
import { eq, count } from 'drizzle-orm'
import { db } from '@/db/client'
import { leads, transactions, complianceLogs, users } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { getEnabledVerticals } from '@/registry/loader'
import packageJson from '@/package.json'

/**
 * GET /api/system
 * Authenticated system status/overview: framework version, enabled
 * verticals, and per-organization record counts. Useful for admin
 * dashboards and for AI agents that need a quick orientation snapshot
 * before making further queries.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'system:read', skipCsrf: true })
  const orgId = session.user.organizationId

  const [leadCount] = await db.select({ value: count() }).from(leads).where(eq(leads.organizationId, orgId))
  const [transactionCount] = await db
    .select({ value: count() })
    .from(transactions)
    .where(eq(transactions.organizationId, orgId))
  const [complianceCount] = await db
    .select({ value: count() })
    .from(complianceLogs)
    .where(eq(complianceLogs.organizationId, orgId))
  const [userCount] = await db.select({ value: count() }).from(users).where(eq(users.organizationId, orgId))

  return apiSuccess({
    name: 'SYJ Nexus Engine',
    version: packageJson.version,
    verticals: getEnabledVerticals().map((v) => ({ id: v.id, name: v.name })),
    counts: {
      leads: leadCount?.value ?? 0,
      transactions: transactionCount?.value ?? 0,
      complianceLogs: complianceCount?.value ?? 0,
      users: userCount?.value ?? 0
    }
  })
})
