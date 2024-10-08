import { type Backup } from '../server/backups';
import { type UndoState } from '../server/undo';

export interface ServerEvents {
  'backups-updated': Backup[];
  'cells-changed': Array<{ name }>;
  'fallback-write-error': unknown;
  'finish-import': unknown;
  'finish-load': unknown;
  'orphaned-payees': {
    orphanedIds: string[];
    updatedPayeeIds: string[];
  };
  'prefs-updated': unknown;
  'schedules-offline': { payees: unknown[] };
  'server-error': unknown;
  'show-budgets': unknown;
  'start-import': unknown;
  'start-load': unknown;
  'sync-event': { type; subtype; meta; tables; syncDisabled };
  'undo-event': UndoState;
  'api-fetch-redirected': unknown;
}
