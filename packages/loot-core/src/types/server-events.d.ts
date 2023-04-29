export interface ServerEvents {
  'backups-updated': unknown;
  'cells-changed': Array<{ name }>;
  'fallback-write-error': unknown;
  'finish-import': unknown;
  'finish-load': unknown;
  'orphaned-payees': unknown;
  'prefs-updated': unknown;
  'schedules-offline': { payees: unknown[] };
  'server-error': unknown;
  'show-budgets': unknown;
  'start-import': unknown;
  'start-load': unknown;
  'sync-event': { type; subtype; meta; tables };
  'undo-event': unknown;
}
