import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { createTransactionSchema, listQuerySchema } from '@/core/validation/domain'
import { createTransaction, listTransactions } from '@/core/operational/dataLayer'
import { isValidVerticalId } from '@/registry/loader'
import { ValidationError } from '@/core/errors/AppError'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'transactions:read', skipCsrf: true })
  const { searchParams } = new URL(request.url)
  const query = listQuerySchema.parse(Object.fromEntries(searchParams))
  const status = searchParams.get('status') ?? undefined
  const leadId = searchParams.get('leadId') ?? undefined

  const rows = await listTransactions(
    { organizationId: session.user.organizationId },
    { verticalId: query.verticalId, status, leadId },
    { page: query.page, pageSize: query.pageSize }
  )

  return apiSuccess({ transactions: rows, page: query.page, pageSize: query.pageSize })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await guard(request, { permission: 'transactions:write' })
  const body = await request.json()
  const input = createTransactionSchema.parse(body)

  if (!isValidVerticalId(input.verticalId)) {
    throw new ValidationError(`Unknown or disabled verticalId: ${input.verticalId}`)
  }

  const transaction = await createTransaction(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    input
  )

  return apiSuccess({ transaction }, undefined, 201)
})
