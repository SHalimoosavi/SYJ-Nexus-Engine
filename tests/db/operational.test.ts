import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Point the app at a throwaway SQLite file for this test run, before any
// module under test imports db/client (which reads DATABASE_PATH at
// import time).
const tmpDbPath = path.join(os.tmpdir(), `nexus-test-${Date.now()}.db`)
process.env.DATABASE_PATH = tmpDbPath

const { rawSqlite } = await import('@/db/client')
const { organizations, users, leads } = await import('@/db/schema')
const { generateId } = await import('@/lib/id')
const { createLead, getLeadById, updateLead, getEntityTimeline } = await import('@/core/operational/dataLayer')

function applyMinimalSchema() {
  // Mirrors db/schema.ts closely enough for these operational-layer tests
  // without requiring a full drizzle-kit migration run in the test suite.
  rawSqlite.exec(`
    CREATE TABLE organizations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, email TEXT NOT NULL,
      password_hash TEXT NOT NULL, full_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
    CREATE TABLE leads (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, vertical_id TEXT NOT NULL,
      title TEXT NOT NULL, stage TEXT NOT NULL, contact_name TEXT, contact_email TEXT,
      contact_phone TEXT, value INTEGER, currency TEXT DEFAULT 'INR', owner_id TEXT,
      metadata TEXT, created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
    CREATE TABLE activities (
      id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, vertical_id TEXT,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, actor_id TEXT,
      action TEXT NOT NULL, summary TEXT NOT NULL, metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
  `)
}

describe('unified operational data layer — leads', () => {
  let orgId: string

  beforeAll(() => {
    applyMinimalSchema()
    orgId = generateId('org')
    rawSqlite
      .prepare('INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)')
      .run(orgId, 'Test Org', 'test-org')
  })

  afterAll(() => {
    rawSqlite.close()
    fs.rmSync(tmpDbPath, { force: true })
    fs.rmSync(`${tmpDbPath}-wal`, { force: true })
    fs.rmSync(`${tmpDbPath}-shm`, { force: true })
  })

  it('creates a lead and records a "created" activity', async () => {
    const lead = await createLead(
      { organizationId: orgId },
      { verticalId: 'retail', title: 'Test Lead', stage: 'inquiry' }
    )

    expect(lead.title).toBe('Test Lead')
    expect(lead.stage).toBe('inquiry')

    const timeline = await getEntityTimeline({ organizationId: orgId }, 'lead', lead.id, { page: 1, pageSize: 10 })
    expect(timeline.length).toBe(1)
    expect(timeline[0]?.action).toBe('created')
  })

  it('scopes lead lookups to the organization', async () => {
    const lead = await createLead(
      { organizationId: orgId },
      { verticalId: 'retail', title: 'Scoped Lead', stage: 'inquiry' }
    )

    await expect(getLeadById({ organizationId: 'some_other_org' }, lead.id)).rejects.toThrow()
  })

  it('records a "stage_changed" activity distinct from a generic update', async () => {
    const lead = await createLead(
      { organizationId: orgId },
      { verticalId: 'retail', title: 'Stage Test Lead', stage: 'inquiry' }
    )

    await updateLead({ organizationId: orgId }, lead.id, { stage: 'won' })

    const timeline = await getEntityTimeline({ organizationId: orgId }, 'lead', lead.id, { page: 1, pageSize: 10 })
    const actions = timeline.map((t) => t.action)
    expect(actions).toContain('stage_changed')
  })
})
