import { getActiveSession } from '@/core/auth/session'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'

/**
 * GET /api/auth/session
 * Returns the current authenticated user (or null) without throwing —
 * intended for client apps to check auth status on load.
 */
export const GET = withErrorHandling(async () => {
  const session = await getActiveSession()

  if (!session) {
    return apiSuccess({ authenticated: false, user: null })
  }

  return apiSuccess({
    authenticated: true,
    user: session.user,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt
  })
})
