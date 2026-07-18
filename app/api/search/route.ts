import { NextRequest } from 'next/server'
import { and, eq, like, or } from 'drizzle-orm'
import { db } from '@/db/client'
import { complianceLogs, leads, transactions, users } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { searchQuerySchema } from '@/core/validation/domain'

/**
 * GET /api/search?q=...&types=lead,transaction
 * Global search across the unified operational layer. This is the
 * primary "global filter" surface for both the dashboard and AI agents
 * that need to look records up by free text before acting on them.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const typesParam = searchParams.get('types')
  const parsed = searchQuerySchema.parse({
    q: searchParams.get('q') ?? '',
    types: typesParam ? typesParam.split(',') : undefined
  })

  const orgId = session.user.organizationId
  const wantedTypes = new Set(parsed.types ?? ['lead', 'transaction', 'compliance_log', 'user'])
  const term = `%${parsed.q}%`

  const results: Record<string, unknown[]> = {}

  if (wantedTypes.has('lead')) {
    results.leads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.organizationId, orgId), like(leads.title, term)))
      .limit(20)
  }

  if (wantedTypes.has('transaction')) {
    results.transactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.organizationId, orgId), like(transactions.reference, term)))
      .limit(20)
  }

  if (wantedTypes.has('compliance_log')) {
    results.complianceLogs = await db
      .select()
      .from(complianceLogs)
      .where(and(eq(complianceLogs.organizationId, orgId), like(complianceLogs.complianceType, term)))
      .limit(20)
  }

  if (wantedTypes.has('user')) {
    results.users = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          or(like(users.fullName, term), like(users.email, term))
        )
      )
      .limit(20)
  }

  return apiSuccess({ query: parsed.q, results })
})
