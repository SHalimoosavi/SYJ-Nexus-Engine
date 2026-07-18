import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { AuthorizationError, NotFoundError, ValidationError } from '@/core/errors/AppError'
import { recordAuditEvent } from '@/core/logging/audit'
import { z } from 'zod'

interface Params {
  params: { id: string }
}

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional()
})

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { skipCsrf: true })
  if (params.id !== session.user.organizationId) {
    throw new AuthorizationError('Cannot view a different organization')
  }

  const rows = await db.select().from(organizations).where(eq(organizations.id, params.id)).limit(1)
  const org = rows[0]
  if (!org) throw new NotFoundError('Organization')
  return apiSuccess({ organization: org })
})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'org:admin' })
  if (params.id !== session.user.organizationId) {
    throw new AuthorizationError('Cannot modify a different organization')
  }

  const body = await request.json()
  const patch = updateOrgSchema.parse(body)
  if (Object.keys(patch).length === 0) {
    throw new ValidationError('No updatable fields provided')
  }

  await db
    .update(organizations)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, params.id))

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'organization.updated',
    entityType: 'organization',
    entityId: params.id
  })

  return apiSuccess({ updated: true })
})
