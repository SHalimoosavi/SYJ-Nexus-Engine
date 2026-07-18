# modules/

This is the extension layer. `core/` holds infrastructure that every deployment needs
(auth, RBAC, the unified operational data layer, logging). `modules/` is where optional,
swappable, or vertical-adjacent functionality lives instead — things a given deployment
might not need at all.

`eventBus.ts` is the reference example: a minimal in-process pub/sub so other code can react
to `lead.created`, `transaction.created`, etc. without editing `core/operational/dataLayer.ts`.

Guidelines for anything you add here:

- A module must not be required for `core/` to function — the app should boot and pass
  `npm run health` with the module deleted.
- A module may depend on `core/` and `db/`, never the other way around.
- If a module needs its own table, add it to `db/schema.ts` like any other table, but keep
  the query logic for it inside the module, not inside `core/operational/dataLayer.ts` unless
  it's genuinely shared by every vertical.
- Prefer wiring modules into the app at the specific API route that needs them, not globally.
