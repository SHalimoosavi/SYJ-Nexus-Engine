import { nanoid } from 'nanoid'

/**
 * Generates a prefixed, sortable-enough unique ID for a given entity type.
 * Prefixes make IDs self-describing in logs and API responses
 * (e.g. "usr_V1StGXR8", "lead_8Yz3pQmN").
 */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(12)}`
}
