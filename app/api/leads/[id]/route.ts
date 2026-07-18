import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { updateLeadSchema } from '@/core/validation/domain'
import { getLeadById, updateLead } from '@/core/operational/dataLayer'

interface Params {
  params: { id: string }
}

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'leads:read', skipCsrf: true })
  const lead = await getLeadById({ organizationId: session.user.organizationId }, params.id)
  return apiSuccess({ lead })
})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'leads:write' })
  const body = await request.json()
  const patch = updateLeadSchema.parse(body)
  const lead = await updateLead(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    params.id,
    patch
  )
  return apiSuccess({ lead })
})
