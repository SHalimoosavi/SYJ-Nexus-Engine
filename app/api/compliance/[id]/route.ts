import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { updateComplianceLogSchema } from '@/core/validation/domain'
import { getComplianceLogById, updateComplianceLog } from '@/core/operational/dataLayer'

interface Params {
  params: { id: string }
}

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'compliance:read', skipCsrf: true })
  const log = await getComplianceLogById({ organizationId: session.user.organizationId }, params.id)
  return apiSuccess({ complianceLog: log })
})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'compliance:write' })
  const body = await request.json()
  const patch = updateComplianceLogSchema.parse(body)
  const log = await updateComplianceLog(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    params.id,
    patch
  )
  return apiSuccess({ complianceLog: log })
})
