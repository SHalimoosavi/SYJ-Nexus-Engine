import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { userRoles, users } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { createUserSchema } from '@/core/validation/domain'
import { hashPassword, isPasswordStrongEnough } from '@/core/auth/password'
import { generateId } from '@/lib/id'
import { ConflictError, ValidationError } from '@/core/errors/AppError'
import { recordAuditEvent } from '@/core/logging/audit'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'users:read', skipCsrf: true })

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.organizationId, session.user.organizationId))

  return apiSuccess({ users: rows })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'users:write' })
  const body = await request.json()
  const input = createUserSchema.parse(body)

  const strength = isPasswordStrongEnough(input.password)
  if (!strength.ok) throw new ValidationError(strength.reason ?? 'Weak password')

  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
  if (existing[0]) throw new ConflictError('A user with this email already exists')

  const passwordHash = await hashPassword(input.password)
  const userId = generateId('usr')

  await db.insert(users).values({
    id: userId,
    organizationId: session.user.organizationId,
    email: input.email,
    passwordHash,
    fullName: input.fullName
  })

  for (const roleId of input.roleIds ?? []) {
    await db.insert(userRoles).values({ id: generateId('ur'), userId, roleId })
  }

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'user.created',
    entityType: 'user',
    entityId: userId
  })

  return apiSuccess({ user: { id: userId, email: input.email, fullName: input.fullName } }, undefined, 201)
})
