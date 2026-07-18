import { NextRequest } from 'next/server'
import { getActiveSession, revokeCurrentSession } from '@/core/auth/session'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { AuthenticationError } from '@/core/errors/AppError'
import { assertCsrfValid } from '@/core/auth/csrf'
import { recordAuditEvent } from '@/core/logging/audit'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getActiveSession()
  if (!session) throw new AuthenticationError()

  assertCsrfValid(request, session)

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'auth.logout'
  })

  await revokeCurrentSession()

  return apiSuccess({ loggedOut: true })
})
