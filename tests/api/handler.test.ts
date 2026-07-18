import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { apiSuccess, apiError, withErrorHandling } from '@/core/errors/handler'
import { NotFoundError, ValidationError, AuthenticationError } from '@/core/errors/AppError'

describe('apiSuccess', () => {
  it('wraps data in a consistent success envelope', async () => {
    const response = apiSuccess({ hello: 'world' })
    const body = await response.json()
    expect(body).toEqual({ success: true, data: { hello: 'world' } })
    expect(response.status).toBe(200)
  })

  it('respects a custom status code', async () => {
    const response = apiSuccess({ created: true }, undefined, 201)
    expect(response.status).toBe(201)
  })
})

describe('apiError', () => {
  it('maps AppError subclasses to their status codes', async () => {
    const response = apiError(new NotFoundError('Widget'))
    const body = await response.json()
    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('maps ValidationError to 400', async () => {
    const response = apiError(new ValidationError('Bad input'))
    expect(response.status).toBe(400)
  })

  it('maps AuthenticationError to 401', async () => {
    const response = apiError(new AuthenticationError())
    expect(response.status).toBe(401)
  })

  it('translates ZodError into a 400 validation response', async () => {
    const schema = z.object({ email: z.string().email() })
    const result = schema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const response = apiError(result.error)
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('never leaks internal error messages for unexpected errors', async () => {
    const response = apiError(new Error('sensitive internal detail: db password xyz'))
    const body = await response.json()
    expect(response.status).toBe(500)
    expect(JSON.stringify(body)).not.toContain('sensitive internal detail')
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})

describe('withErrorHandling', () => {
  it('passes through a successful handler result', async () => {
    const handler = withErrorHandling(async () => apiSuccess({ ok: true }))
    const response = await handler()
    const body = await response.json()
    expect(body.data.ok).toBe(true)
  })

  it('catches a thrown AppError and converts it to a response', async () => {
    const handler = withErrorHandling(async () => {
      throw new NotFoundError('Thing')
    })
    const response = await handler()
    expect(response.status).toBe(404)
  })
})
