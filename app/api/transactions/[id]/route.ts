import { NextRequest } from 'next/server'
import { guard } from '@/core/auth/guard'
import { apiSuccess, withErrorHandling } from '@/core/errors/handler'
import { updateTransactionSchema } from '@/core/validation/domain'
import { getTransactionById, updateTransaction } from '@/core/operational/dataLayer'

interface Params {
  params: { id: string }
}

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'transactions:read', skipCsrf: true })
  const transaction = await getTransactionById({ organizationId: session.user.organizationId }, params.id)
  return apiSuccess({ transaction })
})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const session = await guard(request, { permission: 'transactions:write' })
  const body = await request.json()
  const patch = updateTransactionSchema.parse(body)
  const transaction = await updateTransaction(
    { organizationId: session.user.organizationId, actorId: session.user.id },
    params.id,
    patch
  )
  return apiSuccess({ transaction })
})
