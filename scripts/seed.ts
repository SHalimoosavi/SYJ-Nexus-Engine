/**
 * Seeds the database with:
 *  - A default organization (from SEED_ORG_NAME)
 *  - An Admin role with every system permission
 *  - A bootstrap admin user (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  - A handful of sample leads/compliance logs/transactions across a few
 *    verticals, so a fresh install has something to look at immediately.
 *
 * Safe to re-run: it checks for existing rows before inserting.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, rawSqlite } from '../db/client'
import {
  organizations,
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  leads,
  complianceLogs,
  transactions
} from '../db/schema'
import { generateId } from '../lib/id'
import { hashPassword } from '../core/auth/password'
import { SYSTEM_PERMISSIONS } from '../core/authz/rbac'

async function main() {
  const orgName = process.env.SEED_ORG_NAME || 'Default Organization'
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'

  console.log('[seed] Starting seed...')

  let org = (await db.select().from(organizations).where(eq(organizations.name, orgName)).limit(1))[0]
  if (!org) {
    const orgId = generateId('org')
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await db.insert(organizations).values({ id: orgId, name: orgName, slug })
    org = { id: orgId, name: orgName, slug, isActive: true, createdAt: '', updatedAt: '' } as typeof org
    console.log(`[seed] Created organization "${orgName}" (${orgId})`)
  } else {
    console.log(`[seed] Organization "${orgName}" already exists (${org.id})`)
  }

  let adminRole = (
    await db.select().from(roles).where(eq(roles.organizationId, org.id)).limit(50)
  ).find((r) => r.name === 'Admin')

  if (!adminRole) {
    const roleId = generateId('role')
    await db.insert(roles).values({
      id: roleId,
      organizationId: org.id,
      name: 'Admin',
      description: 'Full administrative access',
      isSystem: true
    })
    adminRole = { id: roleId, organizationId: org.id, name: 'Admin', description: '', isSystem: true, createdAt: '' }
    console.log(`[seed] Created Admin role (${roleId})`)
  }

  for (const key of SYSTEM_PERMISSIONS) {
    let perm = (await db.select().from(permissions).where(eq(permissions.key, key)).limit(1))[0]
    if (!perm) {
      const permId = generateId('perm')
      await db.insert(permissions).values({ id: permId, key, description: key })
      perm = { id: permId, key, description: key }
    }

    const existingBinding = (
      await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, adminRole.id)).limit(200)
    ).find((rp) => rp.permissionId === perm!.id)

    if (!existingBinding) {
      await db.insert(rolePermissions).values({ id: generateId('rp'), roleId: adminRole.id, permissionId: perm.id })
    }
  }
  console.log(`[seed] Ensured ${SYSTEM_PERMISSIONS.length} system permissions bound to Admin role`)

  let adminUser = (await db.select().from(users).where(eq(users.email, adminEmail)).limit(1))[0]
  if (!adminUser) {
    const userId = generateId('usr')
    const passwordHash = await hashPassword(adminPassword)
    await db.insert(users).values({
      id: userId,
      organizationId: org.id,
      email: adminEmail,
      passwordHash,
      fullName: 'System Administrator'
    })
    await db.insert(userRoles).values({ id: generateId('ur'), userId, roleId: adminRole.id })
    adminUser = { id: userId } as typeof adminUser
    console.log(`[seed] Created admin user ${adminEmail} / password from SEED_ADMIN_PASSWORD`)
  } else {
    console.log(`[seed] Admin user ${adminEmail} already exists`)
  }

  const existingLeads = await db.select().from(leads).where(eq(leads.organizationId, org.id)).limit(1)
  if (existingLeads.length === 0) {
    const sampleLeads = [
      { verticalId: 'retail', title: 'Storefront POS rollout — Hyderabad', stage: 'inquiry', value: 250000 },
      { verticalId: 'logistics', title: 'Fleet tracking pilot — 12 vehicles', stage: 'quote', value: 480000 },
      { verticalId: 'agriculture', title: 'Organic certification onboarding', stage: 'proposal', value: 120000 }
    ]
    for (const l of sampleLeads) {
      const leadId = generateId('lead')
      await db.insert(leads).values({
        id: leadId,
        organizationId: org.id,
        verticalId: l.verticalId,
        title: l.title,
        stage: l.stage,
        value: l.value,
        currency: 'INR',
        ownerId: adminUser.id
      })
    }
    console.log(`[seed] Inserted ${sampleLeads.length} sample leads`)

    const complianceId = generateId('cmpl')
    await db.insert(complianceLogs).values({
      id: complianceId,
      organizationId: org.id,
      verticalId: 'agriculture',
      entityType: 'lead',
      entityId: '',
      complianceType: 'organic_certification',
      status: 'pending',
      reviewedBy: adminUser.id
    })

    const txnId = generateId('txn')
    await db.insert(transactions).values({
      id: txnId,
      organizationId: org.id,
      verticalId: 'retail',
      type: 'invoice',
      amount: 250000,
      currency: 'INR',
      status: 'pending'
    })
    console.log('[seed] Inserted sample compliance log and transaction')
  } else {
    console.log('[seed] Sample operational data already present, skipping')
  }

  console.log('[seed] Complete.')
  console.log(`[seed] Login with: ${adminEmail} / ${adminPassword}`)
  rawSqlite.close()
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
