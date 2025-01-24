import { AccountEntity } from './account';
import { CategoryEntity } from './category';
import { PayeeEntity } from './payee';
import { ScheduleEntity } from './schedule';

export interface TransactionEntity {
  id: string;
  is_parent?: boolean | 1 | 0;
  is_child?: boolean | 1 | 0;
  parent_id?: TransactionEntity['id'];
  account: AccountEntity['id'];
  category?: CategoryEntity['id'];
  amount: number;
  payee?: PayeeEntity['id'];
  notes?: string;
  date: string;
  imported_id?: string;
  imported_payee?: string;
  starting_balance_flag?: boolean | 1 | 0;
  transfer_id?: TransactionEntity['id'];
  sort_order?: number;
  cleared?: boolean | 1 | 0;
  reconciled?: boolean | 1 | 0;
  tombstone?: boolean | 1 | 0;
  forceUpcoming?: boolean | 1 | 0;
  schedule?: ScheduleEntity['id'];
  subtransactions?: TransactionEntity[];
  _unmatched?: boolean;
  _deleted?: boolean;
  error?: {
    type: 'SplitTransactionError';
    version: 1;
    difference: number;
  };
}
