import { z } from 'zod'

/** Shared pagination + filter query params used across list endpoints. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  verticalId: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc')
})

export const createLeadSchema = z.object({
  verticalId: z.string().min(1),
  title: z.string().min(1).max(300),
  stage: z.string().min(1),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  value: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default('INR'),
  ownerId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

export const updateLeadSchema = createLeadSchema.partial()

export const createComplianceLogSchema = z.object({
  verticalId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  complianceType: z.string().min(1),
  status: z.enum(['pending', 'passed', 'failed', 'expired']).default('pending'),
  notes: z.string().max(2000).optional(),
  dueAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
})

export const updateComplianceLogSchema = createComplianceLogSchema.partial()

export const createTransactionSchema = z.object({
  verticalId: z.string().min(1),
  leadId: z.string().optional(),
  type: z.enum(['sale', 'refund', 'invoice', 'payment']),
  amount: z.number().int(),
  currency: z.string().length(3).default('INR'),
  status: z.enum(['pending', 'completed', 'failed', 'reversed']).default('pending'),
  reference: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional()
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  roleIds: z.array(z.string()).optional()
})

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional()
})

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
})

export const updateSettingSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.unknown()
})

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z.array(z.string()).min(1)
})

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(300),
  types: z.array(z.enum(['lead', 'transaction', 'compliance_log', 'user'])).optional()
})
