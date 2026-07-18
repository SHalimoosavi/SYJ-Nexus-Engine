import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '@/core/validation/auth'
import { createLeadSchema, createTransactionSchema, listQuerySchema } from '@/core/validation/domain'

describe('auth validation', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email on login', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects a short password on register', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      fullName: 'Test User',
      organizationName: 'Test Org'
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid register payload', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'longenoughpassword',
      fullName: 'Test User',
      organizationName: 'Test Org'
    })
    expect(result.success).toBe(true)
  })
})

describe('domain validation', () => {
  it('applies pagination defaults', () => {
    const result = listQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('caps pageSize at 100', () => {
    const result = listQuerySchema.safeParse({ pageSize: 500 })
    expect(result.success).toBe(false)
  })

  it('requires a title and stage for lead creation', () => {
    const result = createLeadSchema.safeParse({ verticalId: 'retail', title: '', stage: 'inquiry' })
    expect(result.success).toBe(false)
  })

  it('accepts a minimal valid lead', () => {
    const result = createLeadSchema.safeParse({
      verticalId: 'retail',
      title: 'New storefront lead',
      stage: 'inquiry'
    })
    expect(result.success).toBe(true)
  })

  it('rejects a transaction with an invalid type', () => {
    const result = createTransactionSchema.safeParse({
      verticalId: 'retail',
      type: 'not_a_real_type',
      amount: 100
    })
    expect(result.success).toBe(false)
  })
})
