import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { eq, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { sessions, users } from '@/db/schema'
import { generateId } from '@/lib/id'
import { logger } from '@/core/logging/logger'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'nexus_session'
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 168)

export interface SessionUser {
  id: string
  organizationId: string
  email: string
  fullName: string
}

export interface ActiveSession {
  sessionId: string
  csrfToken: string
  user: SessionUser
  expiresAt: string
}

function ttlExpiryIso(): string {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString()
}

/** Signs the raw session id with SESSION_SECRET (HMAC) to produce the cookie value. */
function signSessionId(sessionId: string): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  const sig = crypto.createHmac('sha256', secret).update(sessionId).digest('hex')
  return `${sessionId}.${sig}`
}

function verifyAndExtractSessionId(cookieValue: string): string | null {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  const [sessionId, sig] = cookieValue.split('.')
  if (!sessionId || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(sessionId).digest('hex')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  return sessionId
}

/**
 * Creates a new session row for a user and sets the signed, httpOnly
 * session cookie. Returns the CSRF token that must be echoed back by the
 * client on state-changing requests.
 */
export async function createSession(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ sessionId: string; csrfToken: string; expiresAt: string }> {
  const sessionId = generateId('sess')
  const csrfToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = ttlExpiryIso()

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    csrfToken,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
    expiresAt
  })

  cookies().set(COOKIE_NAME, signSessionId(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt)
  })

  logger.audit('session.created', { userId, sessionId })

  return { sessionId, csrfToken, expiresAt }
}

/** Reads the session cookie, validates it against the DB, and returns the active session (or null). */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const cookieStore = cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  const sessionId = verifyAndExtractSessionId(raw)
  if (!sessionId) return null

  const rows = await db
    .select({
      sessionId: sessions.id,
      csrfToken: sessions.csrfToken,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      organizationId: users.organizationId,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1)

  const row = rows[0]
  if (!row) return null
  if (!row.isActive) return null
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await revokeSession(row.sessionId)
    return null
  }

  return {
    sessionId: row.sessionId,
    csrfToken: row.csrfToken,
    expiresAt: row.expiresAt,
    user: {
      id: row.userId,
      organizationId: row.organizationId,
      email: row.email,
      fullName: row.fullName
    }
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  cookies().delete(COOKIE_NAME)
  logger.audit('session.revoked', { sessionId })
}

export async function revokeCurrentSession(): Promise<void> {
  const active = await getActiveSession()
  if (active) {
    await revokeSession(active.sessionId)
  } else {
    cookies().delete(COOKIE_NAME)
  }
}

/** Deletes all expired session rows. Intended to be called periodically (e.g. from a cron script). */
export async function purgeExpiredSessions(): Promise<number> {
  const nowIso = new Date().toISOString()
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, nowIso))
  return result.changes ?? 0
}
