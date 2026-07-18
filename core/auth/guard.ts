import type { NextRequest } from 'next/server'
import { getActiveSession, type ActiveSession } from './session'
import { assertCsrfValid } from './csrf'
import { AuthenticationError } from '@/core/errors/AppError'
import { checkRateLimit, getClientIdentifier } from '@/core/authz/rateLimit'
import { requirePermission } from '@/core/authz/rbac'

interface GuardOptions {
  /** If provided, the caller must hold this permission or org:admin. */
  permission?: string
  /** Skip CSRF check (only ever for safe/idempotent read endpoints called cross-origin, e.g. health). */
  skipCsrf?: boolean
}

/**
 * Standard entrypoint guard for protected API routes. Handles, in order:
 * 1. Rate limiting (per client IP)
 * 2. Session authentication
 * 3. CSRF validation (for mutating methods)
 * 4. RBAC permission enforcement (if a permission is specified)
 *
 * Returns the authenticated session so the handler can use it.
 */
export async function guard(request: NextRequest, options: GuardOptions = {}): Promise<ActiveSession> {
  checkRateLimit(getClientIdentifier(request))

  const session = await getActiveSession()
  if (!session) {
    throw new AuthenticationError()
  }

  if (!options.skipCsrf) {
    assertCsrfValid(request, session)
  }

  if (options.permission) {
    await requirePermission(session.user, options.permission)
  }

  return session
}
