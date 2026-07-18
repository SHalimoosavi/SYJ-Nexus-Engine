import { describe, it, expect, beforeEach } from 'vitest'
import { loadRegistry, getEnabledVerticals, getVerticalById, isValidVerticalId, invalidateRegistryCache } from '@/registry/loader'

describe('vertical registry', () => {
  beforeEach(() => {
    invalidateRegistryCache()
  })

  it('loads and validates the registry file', () => {
    const verticals = loadRegistry()
    expect(verticals.length).toBeGreaterThan(0)
  })

  it('every vertical has a unique id', () => {
    const verticals = loadRegistry()
    const ids = verticals.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns only enabled verticals from getEnabledVerticals', () => {
    const enabled = getEnabledVerticals()
    expect(enabled.every((v) => v.enabled)).toBe(true)
  })

  it('finds a known vertical by id', () => {
    const retail = getVerticalById('retail')
    expect(retail).toBeDefined()
    expect(retail?.name).toBe('Retail')
  })

  it('returns undefined for an unknown vertical id', () => {
    expect(getVerticalById('does_not_exist')).toBeUndefined()
  })

  it('validates known vs unknown vertical ids', () => {
    expect(isValidVerticalId('agriculture')).toBe(true)
    expect(isValidVerticalId('nonexistent_vertical')).toBe(false)
  })

  it('caches the registry between calls until invalidated', () => {
    const first = loadRegistry()
    const second = loadRegistry()
    expect(first).toBe(second)
    invalidateRegistryCache()
    const third = loadRegistry()
    expect(third).not.toBe(first)
  })
})
