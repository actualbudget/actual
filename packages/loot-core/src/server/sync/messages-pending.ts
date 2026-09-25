// Sync messages deferred because they reference schema from a newer
// app version; see `deferMessage` and `replayPendingMessages`.
//
// The DDL is shared between the migration and the runtime: the code
// that uses the table also creates it on demand, so it keeps working
// even when the served migration files are older than the code (e.g. a
// stale service-worker cache or an unrebuilt dev environment).
// Dependency-free on purpose — the migration imports this too.
export const PENDING_MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS messages_pending
    (dataset TEXT NOT NULL,
     row TEXT NOT NULL,
     column TEXT NOT NULL,
     timestamp TEXT NOT NULL,
     -- Serialized string form, e.g. "S:hello" (see \`serializeValue\`)
     value TEXT NOT NULL,
     PRIMARY KEY (dataset, row, column));
`;
