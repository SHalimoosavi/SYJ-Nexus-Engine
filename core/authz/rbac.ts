import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { permissions, rolePermissions, roles, userRoles } from '@/db/schema'
import { AuthorizationError } from '@/core/errors/AppError'
import type { SessionUser } from '@/core/auth/session'

/**
 * Central authorization module. Every permission-sensitive operation in
 * the codebase should resolve permissions through this module rather
 * than checking ad-hoc role strings, so RBAC logic lives in exactly one
 * place.
 */

/** Well-known system-level permissions, always available regardless of vertical. */
export const SYSTEM_PERMISSIONS = [
  'org:admin',
  'users:read',
  'users:write',
  'roles:manage',
  'settings:manage',
  'api_keys:manage',
  'audit:read',
  'compliance:read',
  'compliance:write',
  'transactions:read',
  'transactions:write',
  'leads:read',
  'leads:write',
  'search:read',
  'system:read'
] as const

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))

  return new Set(rows.map((r) => r.key))
}

export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.has(permissionKey) || perms.has('org:admin')
}

/** Throws AuthorizationError unless the session user holds the given permission. */
export async function requirePermission(user: SessionUser, permissionKey: string): Promise<void> {
  const allowed = await userHasPermission(user.id, permissionKey)
  if (!allowed) {
    throw new AuthorizationError(`Missing required permission: ${permissionKey}`)
  }
}

/** Throws AuthorizationError unless the session user holds at least one of the given permissions. */
export async function requireAnyPermission(user: SessionUser, permissionKeys: string[]): Promise<void> {
  const perms = await getUserPermissions(user.id)
  if (perms.has('org:admin')) return
  const allowed = permissionKeys.some((p) => perms.has(p))
  if (!allowed) {
    throw new AuthorizationError(`Missing one of required permissions: ${permissionKeys.join(', ')}`)
  }
}
