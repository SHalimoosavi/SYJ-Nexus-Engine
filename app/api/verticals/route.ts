import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { getEnabledVerticals } from '@/registry/loader'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'

/**
 * GET /api/verticals
 * Returns every enabled vertical from the registry. This single endpoint
 * is what drives dashboard navigation, menu construction, and available
 * lead stages/compliance types on the client — adding a vertical to
 * vertical-registry.json makes it appear here automatically.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await guard(request, { skipCsrf: true })
  const verticals = getEnabledVerticals()
  return apiSuccess({ verticals, count: verticals.length })
})
