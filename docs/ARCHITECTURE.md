# Architecture Notes

This file supplements the README with a few decisions worth calling out explicitly.

## Why a single organizations table drives multi-tenancy

Every domain table (`leads`, `transactions`, `compliance_logs`, `activities`, `attachments`,
`settings`, `api_keys`, `sessions` via `users`) carries an `organization_id` foreign key.
There is no separate "tenant" concept distinct from `organizations` — one row there is one
tenant. Every query in `core/operational/dataLayer.ts` and every API route filters by the
authenticated session's `organizationId`, so cross-tenant leakage would require forgetting
that filter, not a schema-level gap.

## Why activities are written automatically, not manually

Early drafts of this layer had callers write to `activities` themselves after each mutation.
That reliably gets forgotten under deadline pressure. `core/operational/dataLayer.ts` now
writes the activity row inside the same function that performs the mutation, so there is no
code path that changes a lead/transaction/compliance log without leaving a timeline entry.

## Why the vertical registry is a JSON file, not a database table

Verticals change rarely, are reviewed like code (a PR, a diff, a rollback), and need to be
readable/editable without spinning up the app or writing a migration. A JSON file checked
into version control does that. If a deployment needs verticals to be editable by an admin at
runtime instead, the natural extension is a `/api/system/verticals` write endpoint that
persists into `settings` and a registry loader that merges both sources — `registry/loader.ts`
is the one seam that would need to change.

## Why SQLite and not a client-server database

Zero external services was a hard design constraint. SQLite in WAL mode handles one writer
and many concurrent readers well, which matches a single Next.js process. `db/client.ts` is
intentionally the only file that imports `better-sqlite3` directly — every other module goes
through Drizzle's query builder — so replacing the dialect later touches one file, not the
whole codebase.
