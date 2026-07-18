'use client'

import { useCallback, useState } from 'react'
import type { ApiResponseBody } from '@/types'

/**
 * Client-side fetch helper for the Nexus API. Handles attaching the
 * x-csrf-token header on mutating requests and unwraps the standard
 * { success, data } / { success, error } envelope into a plain result,
 * so components don't have to repeat that boilerplate.
 */
export function useNexusApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(
    async <T,>(
      path: string,
      options: { method?: string; body?: unknown; csrfToken?: string } = {}
    ): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const method = options.method ?? 'GET'
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (options.csrfToken && method !== 'GET') {
          headers['x-csrf-token'] = options.csrfToken
        }

        const response = await fetch(path, {
          method,
          headers,
          credentials: 'include',
          body: options.body ? JSON.stringify(options.body) : undefined
        })

        const json = (await response.json()) as ApiResponseBody<T>

        if (!json.success) {
          setError(json.error.message)
          return null
        }

        return json.data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { call, loading, error }
}
