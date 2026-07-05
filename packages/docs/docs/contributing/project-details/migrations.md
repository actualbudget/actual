# DB Migrations Guide

There are some important considerations to make when adding a feature with a db migration.

- DB Migrations will require publishing a new API version as the migrations also need to be applied there.

- The AQL Schema file will likely need to be updated to match any table changes.

- You must place your migration file in the `loot-core/migrations` folder, with a strict naming convention.

- The naming convention is as follows: `TIMESTAMP_name.sql`. for example. `1694438752000_add_goal_targets.sql`

- You should be very deliberate with your migration. When adding a feature, try to think about future scenarios and options that may be desired later, so we can minimize the number of migrations.

## The Additive-Only Policy

Migrations must only ever **add** schema. A migration may create a new table, add a new column, or create a new index. A migration must never:

- Drop a table, column, or index.
- Rename a table or a column (a rename is a drop plus an add).
- Change an existing column's type, `NOT NULL` constraint, or default value.
- Edit or delete a migration file that has already shipped in a release.

If a table or column is no longer needed, simply stop using it in code and leave it in place. An unused column in SQLite costs almost nothing.

### Why This Policy Exists

Actual is local-first: every device keeps its own copy of the budget file and applies migrations with whatever app version it is running. Devices on different versions sync against the same budget file at the same time.

- Sync messages are column-level changes. If one client removes or renames a column that another client still writes to, applying those messages fails with an `invalid-schema` sync error.
- When a device downloads the budget file, the applied migrations are compared with the migrations bundled in the app. Removed, edited, or reordered migrations trigger the `out-of-sync-migrations` error, and the budget cannot be opened until the app is updated.
- Migration files are append-only for the same reason: a device that already ran a migration will never run it again, so editing a shipped migration silently forks the database schema between existing and new installs.

## The Schema Snapshot Workflow

The policy is enforced by a test, not just by review. The file `packages/loot-core/src/server/migrate/schema-snapshot.json` records the full database schema (tables, columns, and indexes) produced by running every migration on a fresh database. A test in `packages/loot-core/src/server/migrate/schema-guard.test.ts` rebuilds that schema and compares it with the snapshot:

- If your migration **removes or changes** existing schema, the test fails and cannot be silenced. Rework the migration to be additive.
- If your migration **adds** schema, the test fails with a reminder to regenerate the snapshot. Run the following command from the repository root and commit the updated `schema-snapshot.json` together with your migration:

```bash
yarn generate:schema-snapshot
```

The snapshot diff makes your schema change easy to see in the pull request.

In addition, a CI job checks that new migration files are dated after the latest migration on `master`, and that no shipped migration file was edited or deleted.

## Approved Breaking Changes

In rare cases the maintainers may approve a genuinely breaking schema change. This is a deliberate ceremony:

1. Get explicit approval from the maintainers first.
2. Regenerate the snapshot with the escape hatch:

   ```bash
   SCHEMA_SNAPSHOT_ALLOW_BREAKING=true yarn generate:schema-snapshot
   ```

3. The removed names are recorded in `packages/loot-core/src/server/migrate/retired-names.json`.

Retired names must **never be reused** for new tables or columns. Historical sync messages referencing the old name still exist on other devices and on the sync server, and would repopulate a reintroduced name with stale data. A test enforces this as well.

:::warning
A breaking migration locks out every client that has not yet updated to the app version containing it. Treat it as a last resort.
:::
