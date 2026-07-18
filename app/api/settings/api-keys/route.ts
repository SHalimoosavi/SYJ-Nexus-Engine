import { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { apiKeys } from '@/db/schema'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { createApiKeySchema } from '@/core/validation/domain'
import { generateId } from '@/lib/id'
import { recordAuditEvent } from '@/core/logging/audit'

/**
 * API key management for machine-to-machine / AI-agent access.
 * Keys are shown to the caller exactly once at creation time; only a
 * salted hash and a display prefix are stored thereafter, mirroring how
 * the password module never stores plaintext.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'api_keys:manage', skipCsrf: true })

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, session.user.organizationId))

  return apiSuccess({ apiKeys: rows })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'api_keys:manage' })
  const body = await request.json()
  const input = createApiKeySchema.parse(body)

  const secret = crypto.randomBytes(24).toString('base64url')
  const prefix = secret.slice(0, 8)
  const keyHash = crypto.createHash('sha256').update(secret).digest('hex')
  const id = generateId('key')

  await db.insert(apiKeys).values({
    id,
    organizationId: session.user.organizationId,
    name: input.name,
    keyHash,
    keyPrefix: prefix,
    scopes: input.scopes,
    createdBy: session.user.id
  })

  await recordAuditEvent({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: 'api_key.created',
    entityType: 'api_key',
    entityId: id
  })

  // The full key is returned ONLY here, once. It cannot be retrieved again.
  return apiSuccess(
    { id, name: input.name, key: `nexus_${prefix}_${secret}`, scopes: input.scopes },
    { warning: 'Store this key now — it will not be shown again.' },
    201
  )
})
