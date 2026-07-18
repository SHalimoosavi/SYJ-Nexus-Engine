import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

/**
 * Password hashing via Node's built-in scrypt KDF (RFC 7914), not a
 * third-party native addon. This is a deliberate choice: better-sqlite3
 * is already a native dependency required by the stack, and adding a
 * second native binding (e.g. an argon2 addon) risks missing prebuilt
 * binaries on less common targets — notably Android/Termux, where this
 * framework is designed to run. scrypt is memory-hard, OWASP-approved
 * as an acceptable alternative to argon2id, and ships with Node itself
 * on every platform with zero extra native code.
 *
 * Stored format: scrypt$N$r$p$saltHex$hashHex
 */
function scryptParams() {
  return {
    N: Number(process.env.SCRYPT_COST ?? 16384), // CPU/memory cost, must be power of 2
    r: Number(process.env.SCRYPT_BLOCK_SIZE ?? 8),
    p: Number(process.env.SCRYPT_PARALLELIZATION ?? 1),
    keyLen: 64
  }
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const { N, r, p, keyLen } = scryptParams()
  const salt = crypto.randomBytes(16)
  const derivedKey = (await scrypt(plainPassword, salt, keyLen, { N, r, p, maxmem: 128 * N * r * 2 })) as Buffer
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(hashValue: string, plainPassword: string): Promise<boolean> {
  try {
    const [scheme, nStr, rStr, pStr, saltHex, hashHex] = hashValue.split('$')
    if (scheme !== 'scrypt' || !nStr || !rStr || !pStr || !saltHex || !hashHex) return false

    const N = Number(nStr)
    const r = Number(rStr)
    const p = Number(pStr)
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')

    const derivedKey = (await scrypt(plainPassword, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2
    })) as Buffer

    if (derivedKey.length !== expected.length) return false
    return crypto.timingSafeEqual(derivedKey, expected)
  } catch {
    // Malformed hash or verification failure — treat as invalid, never throw
    return false
  }
}

/**
 * Minimum password policy enforced at registration/reset time.
 * Kept simple and explicit rather than a vague regex.
 */
export function isPasswordStrongEnough(plainPassword: string): { ok: boolean; reason?: string } {
  if (plainPassword.length < 8) {
    return { ok: false, reason: 'Password must be at least 8 characters long' }
  }
  if (!/[A-Z]/.test(plainPassword)) {
    return { ok: false, reason: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(plainPassword)) {
    return { ok: false, reason: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(plainPassword)) {
    return { ok: false, reason: 'Password must contain at least one number' }
  }
  return { ok: true }
}
