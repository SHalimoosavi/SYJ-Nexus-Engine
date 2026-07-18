import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { verifyPassword } from '@/core/auth/password'
import { createSession } from '@/core/auth/session'
import { loginSchema } from '@/core/validation/auth'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { AuthenticationError } from '@/core/errors/AppError'
import { recordAuditEvent } from '@/core/logging/audit'
import { checkRateLimit, getClientIdentifier } from '@/core/authz/rateLimit'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)
  checkRateLimit(identifier)

  const body = await request.json()
  const { email, password } = loginSchema.parse(body)

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  const user = rows[0]

  // Constant-shape response: always verify against something to avoid
  // timing-based user enumeration, even if the account does not exist.
  const passwordHash =
    user?.passwordHash ??
    'scrypt$16384$8$1$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
  const validPassword = await verifyPassword(passwordHash, password)

  if (!user || !validPassword || !user.isActive) {
    await recordAuditEvent({
      action: 'auth.login_failed',
      metadata: { email },
      ipAddress: identifier
    })
    throw new AuthenticationError('Invalid email or password')
  }

  const { csrfToken, expiresAt } = await createSession(user.id, {
    ipAddress: identifier,
    userAgent: request.headers.get('user-agent') ?? undefined
  })

  await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id))

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'auth.login_succeeded',
    ipAddress: identifier
  })

  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId
    },
    csrfToken,
    expiresAt
  })
})
