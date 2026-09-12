import { PENDING_MESSAGES_TABLE_SQL } from '#server/sync/messages-pending';

export default async function runMigration(db) {
  db.execQuery(PENDING_MESSAGES_TABLE_SQL);
}
