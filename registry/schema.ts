import { z } from 'zod'

/**
 * Schema for a single vertical entry in the registry.
 * This is the contract that vertical-registry.json (or any future
 * registry source — DB-backed, remote, etc.) must satisfy.
 */
export const verticalSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Vertical id must be lowercase snake_case'),
  name: z.string().min(1),
  description: z.string().default(''),
  icon: z.string().default('layers'),
  enabled: z.boolean().default(true),
  leadStages: z.array(z.string()).min(1),
  complianceTypes: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([])
})

export const registryFileSchema = z.object({
  verticals: z.array(verticalSchema)
})

export type Vertical = z.infer<typeof verticalSchema>
export type RegistryFile = z.infer<typeof registryFileSchema>
