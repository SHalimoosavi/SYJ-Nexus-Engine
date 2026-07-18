import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { userRoles, users } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { updateUserSchema } from '@/core/validation/domain'
import { NotFoundError } from '@/core/errors/AppError'
import { recordAuditEvent } from '@/core/logging/audit'
import { generateId } from '@/lib/id'

interface Params {
  params: { id: string }
}

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
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
    .where(and(eq(users.id, params.id), eq(users.organizationId, session.user.organizationId)))
    .limit(1)

  const user = rows[0]
  if (!user) throw new NotFoundError('User')
  return apiSuccess({ user })
})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'users:write' })
  const body = await request.json()
  const patch = updateUserSchema.parse(body)

  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.id, params.id), eq(users.organizationId, session.user.organizationId)))
    .limit(1)
  if (!existing[0]) throw new NotFoundError('User')

  if (patch.fullName !== undefined || patch.isActive !== undefined) {
    await db
      .update(users)
      .set({
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, params.id))
  }

  if (patch.roleIds) {
    await db.delete(userRoles).where(eq(userRoles.userId, params.id))
    for (const roleId of patch.roleIds) {
      await db.insert(userRoles).values({ id: generateId('ur'), userId: params.id, roleId })
    }
  }

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'user.updated',
    entityType: 'user',
    entityId: params.id
  })

  return apiSuccess({ updated: true })
})
