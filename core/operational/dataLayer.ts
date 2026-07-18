import { and, desc, asc, eq, like, SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { activities, complianceLogs, leads, transactions } from '@/db/schema'
import { generateId } from '@/lib/id'
import { NotFoundError } from '@/core/errors/AppError'

/**
 * The Unified Operational Data Layer.
 *
 * Leads, compliance logs, transactions, and activities are all
 * organization + vertical scoped and share the same access pattern:
 * list (paginated, filterable), get-by-id, create, update. Every
 * mutation through this layer automatically writes a row to the
 * activities table, so the timeline is always consistent and callers
 * never have to remember to log it separately.
 *
 * This is the single place other modules (API routes, AI-agent facing
 * endpoints, search) should go through rather than querying tables
 * directly, so behavior (scoping, pagination, timeline recording) stays
 * uniform across the whole application.
 */

interface Pagination {
  page: number
  pageSize: number
}

interface ScopedContext {
  organizationId: string
  actorId?: string
}

async function recordActivity(params: {
  organizationId: string
  verticalId?: string | null
  entityType: string
  entityId: string
  actorId?: string
  action: string
  summary: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await db.insert(activities).values({
    id: generateId('act'),
    organizationId: params.organizationId,
    verticalId: params.verticalId ?? null,
    entityType: params.entityType,
    entityId: params.entityId,
    actorId: params.actorId ?? null,
    action: params.action,
    summary: params.summary,
    metadata: params.metadata ?? null
  })
}

/* --------------------------------- Leads --------------------------------- */

export async function listLeads(
  ctx: ScopedContext,
  filters: { verticalId?: string; stage?: string },
  pagination: Pagination
) {
  const conditions: SQL[] = [eq(leads.organizationId, ctx.organizationId)]
  if (filters.verticalId) conditions.push(eq(leads.verticalId, filters.verticalId))
  if (filters.stage) conditions.push(eq(leads.stage, filters.stage))

  const rows = await db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize)

  return rows
}

export async function getLeadById(ctx: ScopedContext, id: string) {
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.organizationId, ctx.organizationId)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new NotFoundError('Lead')
  return row
}

export async function createLead(
  ctx: ScopedContext,
  input: {
    verticalId: string
    title: string
    stage: string
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    value?: number
    currency?: string
    ownerId?: string
    metadata?: Record<string, unknown>
  }
) {
  const id = generateId('lead')
  await db.insert(leads).values({
    id,
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    title: input.title,
    stage: input.stage,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    value: input.value ?? null,
    currency: input.currency ?? 'INR',
    ownerId: input.ownerId ?? null,
    metadata: input.metadata ?? null
  })

  await recordActivity({
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    entityType: 'lead',
    entityId: id,
    actorId: ctx.actorId,
    action: 'created',
    summary: `Lead "${input.title}" created in stage "${input.stage}"`
  })

  return getLeadById(ctx, id)
}

export async function updateLead(
  ctx: ScopedContext,
  id: string,
  patch: Partial<{
    title: string
    stage: string
    contactName: string
    contactEmail: string
    contactPhone: string
    value: number
    currency: string
    ownerId: string
    metadata: Record<string, unknown>
  }>
) {
  const existing = await getLeadById(ctx, id)

  await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(leads.id, id), eq(leads.organizationId, ctx.organizationId)))

  if (patch.stage && patch.stage !== existing.stage) {
    await recordActivity({
      organizationId: ctx.organizationId,
      verticalId: existing.verticalId,
      entityType: 'lead',
      entityId: id,
      actorId: ctx.actorId,
      action: 'stage_changed',
      summary: `Lead stage changed from "${existing.stage}" to "${patch.stage}"`
    })
  } else {
    await recordActivity({
      organizationId: ctx.organizationId,
      verticalId: existing.verticalId,
      entityType: 'lead',
      entityId: id,
      actorId: ctx.actorId,
      action: 'updated',
      summary: `Lead "${existing.title}" updated`
    })
  }

  return getLeadById(ctx, id)
}

/* ----------------------------- Compliance logs ---------------------------- */

export async function listComplianceLogs(
  ctx: ScopedContext,
  filters: { verticalId?: string; status?: string; entityType?: string },
  pagination: Pagination
) {
  const conditions: SQL[] = [eq(complianceLogs.organizationId, ctx.organizationId)]
  if (filters.verticalId) conditions.push(eq(complianceLogs.verticalId, filters.verticalId))
  if (filters.status) conditions.push(eq(complianceLogs.status, filters.status))
  if (filters.entityType) conditions.push(eq(complianceLogs.entityType, filters.entityType))

  return db
    .select()
    .from(complianceLogs)
    .where(and(...conditions))
    .orderBy(desc(complianceLogs.createdAt))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize)
}

export async function getComplianceLogById(ctx: ScopedContext, id: string) {
  const rows = await db
    .select()
    .from(complianceLogs)
    .where(and(eq(complianceLogs.id, id), eq(complianceLogs.organizationId, ctx.organizationId)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new NotFoundError('Compliance log')
  return row
}

export async function createComplianceLog(
  ctx: ScopedContext,
  input: {
    verticalId: string
    entityType: string
    entityId: string
    complianceType: string
    status?: string
    notes?: string
    dueAt?: string
    metadata?: Record<string, unknown>
  }
) {
  const id = generateId('cmpl')
  await db.insert(complianceLogs).values({
    id,
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    entityType: input.entityType,
    entityId: input.entityId,
    complianceType: input.complianceType,
    status: input.status ?? 'pending',
    notes: input.notes ?? null,
    reviewedBy: ctx.actorId ?? null,
    dueAt: input.dueAt ?? null,
    metadata: input.metadata ?? null
  })

  await recordActivity({
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    entityType: 'compliance_log',
    entityId: id,
    actorId: ctx.actorId,
    action: 'created',
    summary: `Compliance log "${input.complianceType}" created for ${input.entityType} ${input.entityId}`
  })

  return getComplianceLogById(ctx, id)
}

export async function updateComplianceLog(
  ctx: ScopedContext,
  id: string,
  patch: Partial<{ status: string; notes: string; dueAt: string; metadata: Record<string, unknown> }>
) {
  const existing = await getComplianceLogById(ctx, id)

  await db
    .update(complianceLogs)
    .set({ ...patch, reviewedBy: ctx.actorId ?? existing.reviewedBy, updatedAt: new Date().toISOString() })
    .where(and(eq(complianceLogs.id, id), eq(complianceLogs.organizationId, ctx.organizationId)))

  await recordActivity({
    organizationId: ctx.organizationId,
    verticalId: existing.verticalId,
    entityType: 'compliance_log',
    entityId: id,
    actorId: ctx.actorId,
    action: 'updated',
    summary: `Compliance log "${existing.complianceType}" updated${patch.status ? ` to status "${patch.status}"` : ''}`
  })

  return getComplianceLogById(ctx, id)
}

/* ------------------------------- Transactions ------------------------------ */

export async function listTransactions(
  ctx: ScopedContext,
  filters: { verticalId?: string; status?: string; leadId?: string },
  pagination: Pagination
) {
  const conditions: SQL[] = [eq(transactions.organizationId, ctx.organizationId)]
  if (filters.verticalId) conditions.push(eq(transactions.verticalId, filters.verticalId))
  if (filters.status) conditions.push(eq(transactions.status, filters.status))
  if (filters.leadId) conditions.push(eq(transactions.leadId, filters.leadId))

  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize)
}

export async function getTransactionById(ctx: ScopedContext, id: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, ctx.organizationId)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new NotFoundError('Transaction')
  return row
}

export async function createTransaction(
  ctx: ScopedContext,
  input: {
    verticalId: string
    leadId?: string
    type: string
    amount: number
    currency?: string
    status?: string
    reference?: string
    metadata?: Record<string, unknown>
  }
) {
  const id = generateId('txn')
  await db.insert(transactions).values({
    id,
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    leadId: input.leadId ?? null,
    type: input.type,
    amount: input.amount,
    currency: input.currency ?? 'INR',
    status: input.status ?? 'pending',
    reference: input.reference ?? null,
    metadata: input.metadata ?? null
  })

  await recordActivity({
    organizationId: ctx.organizationId,
    verticalId: input.verticalId,
    entityType: 'transaction',
    entityId: id,
    actorId: ctx.actorId,
    action: 'created',
    summary: `Transaction of type "${input.type}" created for amount ${input.amount} ${input.currency ?? 'INR'}`
  })

  return getTransactionById(ctx, id)
}

export async function updateTransaction(
  ctx: ScopedContext,
  id: string,
  patch: Partial<{ status: string; reference: string; metadata: Record<string, unknown> }>
) {
  const existing = await getTransactionById(ctx, id)

  await db
    .update(transactions)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, ctx.organizationId)))

  await recordActivity({
    organizationId: ctx.organizationId,
    verticalId: existing.verticalId,
    entityType: 'transaction',
    entityId: id,
    actorId: ctx.actorId,
    action: 'updated',
    summary: `Transaction updated${patch.status ? ` to status "${patch.status}"` : ''}`
  })

  return getTransactionById(ctx, id)
}

/* -------------------------------- Timeline -------------------------------- */

export async function getEntityTimeline(
  ctx: ScopedContext,
  entityType: string,
  entityId: string,
  pagination: Pagination
) {
  return db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.organizationId, ctx.organizationId),
        eq(activities.entityType, entityType),
        eq(activities.entityId, entityId)
      )
    )
    .orderBy(desc(activities.createdAt))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize)
}

export async function listRecentActivity(ctx: ScopedContext, pagination: Pagination) {
  return db
    .select()
    .from(activities)
    .where(eq(activities.organizationId, ctx.organizationId))
    .orderBy(desc(activities.createdAt))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize)
}

export { asc, desc, like }
