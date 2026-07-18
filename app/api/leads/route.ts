import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { createLeadSchema, listQuerySchema } from '@/core/validation/domain'
import { createLead, listLeads } from '@/core/operational/dataLayer'
import { isValidVerticalId } from '@/registry/loader'
import { ValidationError } from '@/core/errors/AppError'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'leads:read', skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))
  const stage = searchParams.get('stage') ?? undefined

  const rows = await listLeads(
    { organizationId: session.user.organizationId },
    { verticalId: query.verticalId, stage },
    { page: query.page, pageSize: query.pageSize }
  )

  return apiSuccess({ leads: rows, page: query.page, pageSize: query.pageSize })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'leads:write' })
  const body = await request.json()
  const input = createLeadSchema.parse(body)

  if (!isValidVerticalId(input.verticalId)) {
    throw new ValidationError(`Unknown or disabled verticalId: ${input.verticalId}`)
  }

  const lead = await createLead(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    input
  )

  return apiSuccess({ lead }, undefined, 201)
})
