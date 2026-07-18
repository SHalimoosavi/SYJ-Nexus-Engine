import { db } from '@/db/client'
import { auditLogs } from '@/db/schema'
import { generateId } from '@/lib/id'
import { logger } from './logger'

interface AuditEntryInput {
  organizationId?: string | null
  actorId?: string | null
  actorType?: 'user' | 'api_key' | 'system'
  action: string
  entityType?: string
  entityId?: string
  ipAddress?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Records a durable audit trail entry in the audit_logs table, in addition
 * to emitting the console audit log line via core/logging/logger. Use
 * this for anything that must be reconstructable later: logins, role
 * changes, record deletions, settings changes, API key issuance, etc.
 */
export async function recordAuditEvent(entry: AuditEntryInput): Promise<void> {
  const id = generateId('audit')

  await db.insert(auditLogs).values({
    id,
    organizationId: entry.organizationId ?? null,
    actorId: entry.actorId ?? null,
    actorType: entry.actorType ?? 'user',
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    ipAddress: entry.ipAddress ?? null,
    metadata: entry.metadata ?? null
  })

  logger.audit(entry.action, {
    id,
    organizationId: entry.organizationId,
    actorId: entry.actorId,
    entityType: entry.entityType,
    entityId: entry.entityId
  })
}
