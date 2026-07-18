import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations, users, roles, rolePermissions, permissions, userRoles } from '@/db/schema'
import { generateId } from '@/lib/id'
import { hashPassword, isPasswordStrongEnough } from '@/core/auth/password'
import { registerSchema } from '@/core/validation/auth'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { ConflictError, ValidationError } from '@/core/errors/AppError'
import { SYSTEM_PERMISSIONS } from '@/core/authz/rbac'
import { recordAuditEvent } from '@/core/logging/audit'
import { checkRateLimit, getClientIdentifier } from '@/core/authz/rateLimit'

/**
 * POST /api/organizations/register
 * Public, unauthenticated endpoint that bootstraps a brand-new tenant:
 * creates the organization, an "Admin" system role with every system
 * permission, and the first user assigned to that role. This is the only
 * route that creates an organization without an existing authenticated
 * admin — every subsequent org-scoped action requires a session.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  checkRateLimit(getClientIdentifier(request))

  const body = await request.json()
  const input = registerSchema.parse(body)

  const strength = isPasswordStrongEnough(input.password)
  if (!strength.ok) {
    throw new ValidationError(strength.reason ?? 'Password does not meet strength requirements')
  }

  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
  if (existing[0]) {
    throw new ConflictError('An account with this email already exists')
  }

  const orgId = generateId('org')
  const slug = input.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || generateId('org')

  await db.insert(organizations).values({ id: orgId, name: input.organizationName, slug })

  const roleId = generateId('role')
  await db.insert(roles).values({
    id: roleId,
    organizationId: orgId,
    name: 'Admin',
    description: 'Full administrative access',
    isSystem: true
  })

  // Ensure every system permission exists, then bind them all to the Admin role.
  for (const key of SYSTEM_PERMISSIONS) {
    const existingPerm = await db.select().from(permissions).where(eq(permissions.key, key)).limit(1)
    let permId = existingPerm[0]?.id
    if (!permId) {
      permId = generateId('perm')
      await db.insert(permissions).values({ id: permId, key, description: key })
    }
    await db.insert(rolePermissions).values({
      id: generateId('rp'),
      roleId,
      permissionId: permId
    })
  }

  const passwordHash = await hashPassword(input.password)
  const userId = generateId('usr')
  await db.insert(users).values({
    id: userId,
    organizationId: orgId,
    email: input.email,
    passwordHash,
    fullName: input.fullName
  })

  await db.insert(userRoles).values({ id: generateId('ur'), userId, roleId })

  await recordAuditEvent({
    organizationId: orgId,
    actorId: userId,
    action: 'organization.registered',
    entityType: 'organization',
    entityId: orgId
  })

  return apiSuccess(
    {
      organization: { id: orgId, name: input.organizationName, slug },
      user: { id: userId, email: input.email, fullName: input.fullName }
    },
    undefined,
    201
  )
})
