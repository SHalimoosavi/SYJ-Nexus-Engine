import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { createComplianceLogSchema, listQuerySchema } from '@/core/validation/domain'
import { createComplianceLog, listComplianceLogs } from '@/core/operational/dataLayer'
import { isValidVerticalId } from '@/registry/loader'
import { ValidationError } from '@/core/errors/AppError'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'compliance:read', skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))
  const status = searchParams.get('status') ?? undefined
  const entityType = searchParams.get('entityType') ?? undefined

  const rows = await listComplianceLogs(
    { organizationId: session.user.organizationId },
    { verticalId: query.verticalId, status, entityType },
    { page: query.page, pageSize: query.pageSize }
  )

  return apiSuccess({ complianceLogs: rows, page: query.page, pageSize: query.pageSize })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'compliance:write' })
  const body = await request.json()
  const input = createComplianceLogSchema.parse(body)

  if (!isValidVerticalId(input.verticalId)) {
    throw new ValidationError(`Unknown or disabled verticalId: ${input.verticalId}`)
  }

  const log = await createComplianceLog(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    input
  )

  return apiSuccess({ complianceLog: log }, undefined, 201)
})
