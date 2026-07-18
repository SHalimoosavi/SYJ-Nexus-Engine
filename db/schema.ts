import { sql } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

/* -------------------------------------------------------------------------
 * Organizations — multi-tenant root entity. Every other domain row hangs
 * off an organizationId so the whole schema is tenant-scoped from day one.
 * ---------------------------------------------------------------------- */
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  slugIdx: uniqueIndex('organizations_slug_idx').on(t.slug)
}))

/* -------------------------------------------------------------------------
 * Users
 * ---------------------------------------------------------------------- */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  orgIdx: index('users_org_idx').on(t.organizationId)
}))

/* -------------------------------------------------------------------------
 * Roles & Permissions (RBAC)
 * ---------------------------------------------------------------------- */
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description').default(''),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgNameIdx: uniqueIndex('roles_org_name_idx').on(t.organizationId, t.name)
}))

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  description: text('description').default('')
}, (t) => ({
  keyIdx: uniqueIndex('permissions_key_idx').on(t.key)
}))

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id)
}, (t) => ({
  roleIdx: index('role_permissions_role_idx').on(t.roleId),
  uniquePair: uniqueIndex('role_permissions_unique_idx').on(t.roleId, t.permissionId)
}))

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  roleId: text('role_id').notNull().references(() => roles.id)
}, (t) => ({
  userIdx: index('user_roles_user_idx').on(t.userId),
  uniquePair: uniqueIndex('user_roles_unique_idx').on(t.userId, t.roleId)
}))

/* -------------------------------------------------------------------------
 * Sessions
 * ---------------------------------------------------------------------- */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  csrfToken: text('csrf_token').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId),
  expiresIdx: index('sessions_expires_idx').on(t.expiresAt)
}))

/* -------------------------------------------------------------------------
 * Unified Operational Data Layer
 * All vertical-facing domain data (leads, compliance, transactions,
 * activities, attachments) share this shape so the app has one consistent
 * query interface regardless of which BYOV vertical the row belongs to.
 * ---------------------------------------------------------------------- */

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  verticalId: text('vertical_id').notNull(),
  title: text('title').notNull(),
  stage: text('stage').notNull(),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  value: integer('value'),
  currency: text('currency').default('INR'),
  ownerId: text('owner_id').references(() => users.id),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('leads_org_idx').on(t.organizationId),
  verticalIdx: index('leads_vertical_idx').on(t.verticalId),
  stageIdx: index('leads_stage_idx').on(t.stage)
}))

export const complianceLogs = sqliteTable('compliance_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  verticalId: text('vertical_id').notNull(),
  entityType: text('entity_type').notNull(), // e.g. 'lead', 'transaction', 'organization'
  entityId: text('entity_id').notNull(),
  complianceType: text('compliance_type').notNull(),
  status: text('status').notNull().default('pending'), // pending | passed | failed | expired
  notes: text('notes'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  dueAt: text('due_at'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('compliance_org_idx').on(t.organizationId),
  entityIdx: index('compliance_entity_idx').on(t.entityType, t.entityId),
  statusIdx: index('compliance_status_idx').on(t.status)
}))

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  verticalId: text('vertical_id').notNull(),
  leadId: text('lead_id').references(() => leads.id),
  type: text('type').notNull(), // e.g. 'sale', 'refund', 'invoice', 'payment'
  amount: integer('amount').notNull(),
  currency: text('currency').default('INR'),
  status: text('status').notNull().default('pending'), // pending | completed | failed | reversed
  reference: text('reference'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('transactions_org_idx').on(t.organizationId),
  leadIdx: index('transactions_lead_idx').on(t.leadId),
  statusIdx: index('transactions_status_idx').on(t.status)
}))

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  verticalId: text('vertical_id'),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  actorId: text('actor_id').references(() => users.id),
  action: text('action').notNull(), // e.g. 'created', 'updated', 'stage_changed', 'commented'
  summary: text('summary').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('activities_org_idx').on(t.organizationId),
  entityIdx: index('activities_entity_idx').on(t.entityType, t.entityId),
  createdIdx: index('activities_created_idx').on(t.createdAt)
}))

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storagePath: text('storage_path').notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('attachments_org_idx').on(t.organizationId),
  entityIdx: index('attachments_entity_idx').on(t.entityType, t.entityId)
}))

/* -------------------------------------------------------------------------
 * Settings / API Keys / Audit Logs
 * ---------------------------------------------------------------------- */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }).$type<unknown>(),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgKeyIdx: uniqueIndex('settings_org_key_idx').on(t.organizationId, t.key)
}))

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull(),
  createdBy: text('created_by').references(() => users.id),
  lastUsedAt: text('last_used_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('api_keys_org_idx').on(t.organizationId),
  prefixIdx: index('api_keys_prefix_idx').on(t.keyPrefix)
}))

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id),
  actorId: text('actor_id').references(() => users.id),
  actorType: text('actor_type').notNull().default('user'), // user | api_key | system
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  ipAddress: text('ip_address'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`)
}, (t) => ({
  orgIdx: index('audit_logs_org_idx').on(t.organizationId),
  actionIdx: index('audit_logs_action_idx').on(t.action),
  createdIdx: index('audit_logs_created_idx').on(t.createdAt)
}))
