import fs from 'node:fs'
import path from 'node:path'
import { registryFileSchema, type Vertical } from './schema'
import { logger } from '@/core/logging/logger'

const REGISTRY_PATH = path.join(process.cwd(), 'registry', 'vertical-registry.json')

let cache: Vertical[] | null = null
let cacheLoadedAt = 0

/**
 * Loads and validates the vertical registry from disk.
 *
 * This is the single point through which the entire application learns
 * which industries/verticals exist. Menus, permissions, dashboard
 * navigation, API routing guards, and module loading all read from this
 * function rather than hardcoding vertical logic. Adding a new vertical
 * means editing vertical-registry.json only — no code changes.
 */
export function loadRegistry(options: { forceReload?: boolean } = {}): Vertical[] {
  if (cache && !options.forceReload) {
    return cache
  }

  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8')
  const parsed = registryFileSchema.safeParse(JSON.parse(raw))

  if (!parsed.success) {
    logger.error('registry.load_failed', {
      issues: parsed.error.issues
    })
    throw new Error(
      `Invalid vertical-registry.json: ${parsed.error.issues.map((i) => i.message).join('; ')}`
    )
  }

  cache = parsed.data.verticals
  cacheLoadedAt = Date.now()
  logger.info('registry.loaded', { count: cache.length, loadedAt: cacheLoadedAt })
  return cache
}

export function getEnabledVerticals(): Vertical[] {
  return loadRegistry().filter((v) => v.enabled)
}

export function getVerticalById(id: string): Vertical | undefined {
  return loadRegistry().find((v) => v.id === id)
}

export function isValidVerticalId(id: string): boolean {
  return getEnabledVerticals().some((v) => v.id === id)
}

/** Returns every permission string declared across all enabled verticals. */
export function getAllVerticalPermissions(): string[] {
  return getEnabledVerticals().flatMap((v) => v.permissions)
}

export function invalidateRegistryCache(): void {
  cache = null
  cacheLoadedAt = 0
}
