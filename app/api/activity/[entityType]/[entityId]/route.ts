import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { listQuerySchema } from '@/core/validation/domain'
import { getEntityTimeline } from '@/core/operational/dataLayer'

interface Params {
  params: { entityType: string; entityId: string }
}

/**
 * GET /api/activity/{entityType}/{entityId}
 * Returns the full activity timeline for a single entity (a lead, a
 * transaction, a compliance log, etc). This is the endpoint AI agents
 * and dashboards use to reconstruct "what happened to this record."
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))

  const rows = await getEntityTimeline(
    { organizationId: session.user.organizationId },
    params.entityType,
    params.entityId,
    { page: query.page, pageSize: query.pageSize }
  )

  return apiSuccess({ timeline: rows, entityType: params.entityType, entityId: params.entityId })
})
