import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { listQuerySchema } from '@/core/validation/domain'
import { listRecentActivity } from '@/core/operational/dataLayer'

/**
 * GET /api/activity
 * Organization-wide activity timeline feed, most recent first.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))

  const rows = await listRecentActivity(
    { organizationId: session.user.organizationId },
    { page: query.page, pageSize: query.pageSize }
  )

  return apiSuccess({ activity: rows, page: query.page, pageSize: query.pageSize })
})
