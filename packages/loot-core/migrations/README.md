# Database migrations

Actual upgrades local budget databases by running the SQL and JavaScript files in this directory in timestamp order. Each file name must start with a numeric id (typically the authoring timestamp in milliseconds), followed by a short description.

## Cross-version sync

Actual supports running different app versions against the same synced budget. A device on an older release may still receive sync messages produced by a newer release, and it must keep loading and syncing until it upgrades.

That only works if newer migrations are **additive-only**: they may extend the schema, but must not remove or rename anything an older client still reads or writes through sync.

Post-cutoff migrations (ids after `1780606215001`, see `ADDITIVE_ONLY_CUTOFF` in `src/server/migrate/migrations.ts`) are enforced by `src/server/migrate/additive-migrations.test.ts`. CI runs that test against the real migration chain.

## Allowed changes

After the cutoff, a migration may:

- Create a new table. Synced tables must use a single primary key column named `id`.
- Add a nullable column, or a `NOT NULL` column with a `DEFAULT`.
- Add a non-unique index.
- Drop or recreate a **view** (views are rebuilt on startup and are not synced).
- Create an internal (non-synced) table. Register it in `NON_SYNCED_TABLES` in `additive-migrations.test.ts`. Internal tables are only exempt from the synced-table rules at creation time; later changes are validated like any other table.

Use `CREATE TABLE IF NOT EXISTS` when a migration might run against a database that already has the table (for example after a migration id is renumbered).

## Disallowed changes

Do **not** drop or rename tables or columns. Do not rebuild a table to change an existing column's type, nullability, default, primary-key membership, `UNIQUE` constraints, or `CHECK` expressions. Do not add `UNIQUE` constraints or required columns without defaults to existing synced tables.

If a column is no longer used, stop reading it in application code and leave it in the database.

Renaming is not supported even via `ALTER TABLE ... RENAME`. Older clients address synced data by table and column name; a rename looks like a delete plus an add and breaks cross-version sync.

## Migration ids

- Use a current timestamp for new migrations. Do not reuse or backdate ids into the pre-cutoff era.
- A long-lived branch may merge after other migrations landed on `master`. If your migration id sorts below ids already on `master`, bump it to a new timestamp before merge so existing databases do not treat it as already applied.
- If you must change a migration that has already shipped, prefer a new migration file rather than editing the old one. If you renumber an id, make the SQL idempotent (`IF NOT EXISTS`, and so on).

## What the test does not cover

`additive-migrations.test.ts` compares the database **schema** before and after each post-cutoff migration. It does not inspect `UPDATE`/`INSERT` statements that rewrite existing row data.

A data migration that changes the meaning or format of values already stored in a column can pass the test but still confuse an older app version reading those rows or applying sync messages. Prefer leaving existing values as-is, or gate behavioral changes on the app version reading them.

For sync **values** (not just columns) from newer clients, see deferred message handling in `src/server/sync/` and `messages_pending`.
