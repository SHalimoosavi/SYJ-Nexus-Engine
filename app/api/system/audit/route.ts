import { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { auditLogs } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { listQuerySchema } from '@/core/validation/domain'

/**
 * GET /api/system/audit
 * Read-only access to the organization's audit trail. Requires the
 * dedicated audit:read permission — separate from general system:read
 * or org:admin — so audit visibility can be granted narrowly (e.g. to a
 * compliance officer role) without granting broader admin rights.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'audit:read', skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))

  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, session.user.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)

  return apiSuccess({ auditLogs: rows, page: query.page, pageSize: query.pageSize })
})
