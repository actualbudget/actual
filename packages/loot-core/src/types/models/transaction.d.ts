import { AccountEntity } from './account';
import { CategoryEntity } from './category';
import { PayeeEntity } from './payee';
import { ScheduleEntity } from './schedule';

export interface TransactionEntity {
  id: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: TransactionEntity['id'];
  account: AccountEntity['id'];
  category?: CategoryEntity['id'];
  amount: number;
  payee?: PayeeEntity['id'];
  notes?: string;
  date: string;
  imported_id?: string;
  imported_payee?: string;
  starting_balance_flag?: boolean;
  transfer_id?: TransactionEntity['id'];
  sort_order?: number;
  cleared?: boolean;
  reconciled?: boolean;
  tombstone?: boolean;
  schedule?: ScheduleEntity['id'];
  subtransactions?: TransactionEntity[];
}
