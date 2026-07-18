import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { settings } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { updateSettingSchema } from '@/core/validation/domain'
import { generateId } from '@/lib/id'
import { recordAuditEvent } from '@/core/logging/audit'

/**
 * GET /api/settings — list all settings for the organization.
 * PUT /api/settings — upsert a single setting key/value pair.
 * This is the Configuration Manager module: a generic, typed key-value
 * store scoped per organization so verticals and modules can persist
 * arbitrary configuration without new tables/migrations.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'settings:manage', skipCsrf: true })

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.organizationId, session.user.organizationId))

  return apiSuccess({ settings: rows })
})

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'settings:manage' })
  const body = await request.json()
  const input = updateSettingSchema.parse(body)

  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.organizationId, session.user.organizationId), eq(settings.key, input.key)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(settings)
      .set({ value: input.value, updatedBy: session.user.id, updatedAt: new Date().toISOString() })
      .where(eq(settings.id, existing[0].id))
  } else {
    await db.insert(settings).values({
      id: generateId('set'),
      organizationId: session.user.organizationId,
      key: input.key,
      value: input.value,
      updatedBy: session.user.id
    })
  }

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'settings.updated',
    entityType: 'setting',
    entityId: input.key
  })

  return apiSuccess({ key: input.key, value: input.value })
})
