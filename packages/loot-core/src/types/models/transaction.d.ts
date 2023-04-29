import type { AccountEntity } from './account';
import type { CategoryEntity } from './category';
import type { PayeeEntity } from './payee';
import type { ScheduleEntity } from './schedule';

export interface TransactionEntity {
  id?: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
  account: AccountEntity;
  category?: CategoryEntity;
  amount: number;
  payee?: PayeeEntity;
  notes?: string;
  date: string;
  imported_id?: string;
  error?: unknown;
  imported_payee?: string;
  starting_balance_flag?: boolean;
  transfer_id?: string;
  sort_order?: number;
  cleared?: boolean;
  tombstone?: boolean;
  schedule?: ScheduleEntity;
  subtransactions?: TransactionEntity[];
  // TODO: remove once properly typed
  [k: string]: unknown;
}
