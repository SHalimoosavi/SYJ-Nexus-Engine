import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, isPasswordStrongEnough } from '@/core/auth/password'

describe('password hashing', () => {
  it('hashes a password to a non-plaintext value', async () => {
    const hash = await hashPassword('CorrectHorseBattery1')
    expect(hash).not.toBe('CorrectHorseBattery1')
    expect(hash.startsWith('scrypt$')).toBe(true)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('CorrectHorseBattery1')
    const valid = await verifyPassword(hash, 'CorrectHorseBattery1')
    expect(valid).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('CorrectHorseBattery1')
    const valid = await verifyPassword(hash, 'WrongPassword1')
    expect(valid).toBe(false)
  })

  it('produces different hashes for the same password (random salt)', async () => {
    const hash1 = await hashPassword('SamePassword1')
    const hash2 = await hashPassword('SamePassword1')
    expect(hash1).not.toBe(hash2)
  })

  it('never throws on malformed stored hashes', async () => {
    const valid = await verifyPassword('not-a-real-hash', 'anything')
    expect(valid).toBe(false)
  })

  describe('password strength policy', () => {
    it('rejects short passwords', () => {
      expect(isPasswordStrongEnough('Ab1').ok).toBe(false)
    })

    it('rejects passwords without uppercase', () => {
      expect(isPasswordStrongEnough('lowercase1').ok).toBe(false)
    })

    it('rejects passwords without a number', () => {
      expect(isPasswordStrongEnough('NoNumbersHere').ok).toBe(false)
    })

    it('accepts a strong password', () => {
      expect(isPasswordStrongEnough('StrongPass1').ok).toBe(true)
    })
  })
})
