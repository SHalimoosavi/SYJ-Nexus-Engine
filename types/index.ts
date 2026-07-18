import type { InferSelectModel } from 'drizzle-orm'
import type {
  organizations,
  users,
  roles,
  permissions,
  leads,
  complianceLogs,
  transactions,
  activities,
  attachments,
  settings,
  apiKeys,
  auditLogs
} from '@/db/schema'

export type Organization = InferSelectModel<typeof organizations>
export type User = InferSelectModel<typeof users>
export type Role = InferSelectModel<typeof roles>
export type Permission = InferSelectModel<typeof permissions>
export type Lead = InferSelectModel<typeof leads>
export type ComplianceLog = InferSelectModel<typeof complianceLogs>
export type Transaction = InferSelectModel<typeof transactions>
export type Activity = InferSelectModel<typeof activities>
export type Attachment = InferSelectModel<typeof attachments>
export type Setting = InferSelectModel<typeof settings>
export type ApiKey = InferSelectModel<typeof apiKeys>
export type AuditLog = InferSelectModel<typeof auditLogs>

/** Standard API response envelope shape, mirrored from core/errors/handler.ts for client-side typing. */
export interface ApiSuccessBody<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody
