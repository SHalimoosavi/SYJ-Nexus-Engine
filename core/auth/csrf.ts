import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'
import { AuthorizationError } from '@/core/errors/AppError'
import type { ActiveSession } from './session'

const CSRF_HEADER = 'x-csrf-token'

/**
 * Double-submit CSRF check for state-changing requests (POST/PUT/PATCH/DELETE).
 * The CSRF token is issued at login (tied to the session row) and the
 * client must echo it back in the `x-csrf-token` header. Since the
 * session cookie is httpOnly, an attacker's cross-site request cannot
 * read the token to replay it.
 */
export function assertCsrfValid(request: NextRequest, session: ActiveSession): void {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const provided = request.headers.get(CSRF_HEADER)
  if (!provided) {
    throw new AuthorizationError('Missing CSRF token')
  }

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(session.csrfToken)
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    throw new AuthorizationError('Invalid CSRF token')
  }
}
