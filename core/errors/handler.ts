import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError } from './AppError'
import { logger } from '@/core/logging/logger'

interface ApiSuccess<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, init?: number): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status: init ?? 200 })
}

/**
 * Converts any thrown error into a consistent, safe JSON error response.
 * Never leaks stack traces, SQL, or internal messages for unexpected
 * (non-AppError) failures — those are logged server-side only and the
 * client receives a generic message.
 */
export function apiError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        }
      },
      { status: 400 }
    )
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('api.error', { code: error.code, message: error.message })
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: error.code, message: error.message, details: error.details }
      },
      { status: error.statusCode }
    )
  }

  logger.error('api.unhandled_error', {
    message: error instanceof Error ? error.message : String(error)
  })

  return NextResponse.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    },
    { status: 500 }
  )
}

/**
 * Wraps a route handler so any thrown error (validation, domain, or
 * unexpected) is translated into a safe, consistent JSON response.
 * Use this in every route: `export const POST = withErrorHandling(handler)`
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args)
    } catch (error) {
      return apiError(error)
    }
  }
}
