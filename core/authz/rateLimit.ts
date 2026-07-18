import { RateLimitError } from '@/core/errors/AppError'

/**
 * Simple in-memory sliding-window rate limiter, keyed per identifier
 * (typically IP address or API key id). This is intentionally dependency
 * free so the framework runs with zero external services out of the box.
 *
 * For multi-instance deployments, swap the `store` implementation for a
 * shared backend (e.g. Redis) — the public API (`checkRateLimit`) does
 * not need to change.
 */

interface WindowEntry {
  count: number
  windowStart: number
}

const store = new Map<string, WindowEntry>()

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000)
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100)

export function checkRateLimit(identifier: string): void {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(identifier, { count: 1, windowStart: now })
    return
  }

  if (entry.count >= MAX_REQUESTS) {
    throw new RateLimitError(`Rate limit exceeded: max ${MAX_REQUESTS} requests per ${WINDOW_MS}ms`)
  }

  entry.count += 1
}

/** Periodically called to prevent unbounded memory growth. */
export function pruneRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key)
    }
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return 'unknown'
}
