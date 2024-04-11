import type { AccountEntity } from './account';
import type { CategoryEntity } from './category';
import type { PayeeEntity } from './payee';
import type { ScheduleEntity } from './schedule';

export interface NewTransactionEntity {
  id?: string;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string;
  account: string;
  category?: string;
  amount: number;
  payee?: string;
  notes?: string;
  date: string;
  imported_id?: string;
  imported_payee?: string;
  starting_balance_flag?: boolean;
  transfer_id?: string;
  sort_order?: number;
  cleared?: boolean;
  reconciled?: boolean;
  tombstone?: boolean;
  schedule?: string;
  subtransactions?: Omit<NewTransactionEntity, 'account' | 'date'>[];
  _unmatched?: boolean;
}

export interface TransactionEntity extends NewTransactionEntity {
  id: string;
  account: AccountEntity;
  category?: CategoryEntity;
  payee?: PayeeEntity;
  schedule?: ScheduleEntity;
  subtransactions?: TransactionEntity[];
}
