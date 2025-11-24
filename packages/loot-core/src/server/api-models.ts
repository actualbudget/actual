import { Budget } from '../types/budget';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  ScheduleEntity,
} from '../types/models';

import { RemoteFile } from './cloud-storage';
import * as models from './models';

export type APIAccountEntity = Pick<AccountEntity, 'id' | 'name'> & {
  offbudget?: boolean;
  closed?: boolean;
};

export const accountModel = {
  ...models.accountModel,

  toExternal(account: AccountEntity): APIAccountEntity {
    return {
      id: account.id,
      name: account.name,
      offbudget: account.offbudget ? true : false,
      closed: account.closed ? true : false,
    };
  },

  fromExternal(account: APIAccountEntity) {
    const result = { ...account } as unknown as AccountEntity;
    if ('offbudget' in account) {
      result.offbudget = account.offbudget ? 1 : 0;
    }
    if ('closed' in account) {
      result.closed = account.closed ? 1 : 0;
    }
    return result;
  },
};

export type APICategoryEntity = Pick<
  CategoryEntity,
  'id' | 'name' | 'is_income' | 'hidden'
> & {
  group_id: string;
};

export const categoryModel = {
  ...models.categoryModel,

  toExternal(category: CategoryEntity): APICategoryEntity {
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income ? true : false,
      hidden: category.hidden ? true : false,
      group_id: category.group,
    };
  },

  fromExternal(category: APICategoryEntity) {
    const { group_id, ...apiCategory } = category;
    const result: CategoryEntity = {
      ...apiCategory,
      group: group_id,
    };
    return result;
  },
};

export type APICategoryGroupEntity = Pick<
  CategoryGroupEntity,
  'id' | 'name' | 'is_income' | 'hidden'
> & {
  categories?: APICategoryEntity[];
};

export const categoryGroupModel = {
  ...models.categoryGroupModel,

  toExternal(group: CategoryGroupEntity): APICategoryGroupEntity {
    return {
      id: group.id,
      name: group.name,
      is_income: group.is_income ? true : false,
      hidden: group.hidden ? true : false,
      categories: group.categories?.map(categoryModel.toExternal) || [],
    };
  },

  fromExternal(group: APICategoryGroupEntity) {
    const result = { ...group } as unknown as CategoryGroupEntity;
    if ('categories' in group && group.categories) {
      result.categories = group.categories.map(categoryModel.fromExternal);
    }
    return result;
  },
};

export type APIPayeeEntity = Pick<PayeeEntity, 'id' | 'name' | 'transfer_acct'>;

export const payeeModel = {
  ...models.payeeModel,

  toExternal(payee: PayeeEntity) {
    return {
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct,
    };
  },

  fromExternal(payee: APIPayeeEntity) {
    // No translation is needed
    return payee as PayeeEntity;
  },
};

export type APIFileEntity = Omit<RemoteFile, 'deleted' | 'fileId'> & {
  id?: string;
  cloudFileId: string;
  state?: 'remote';
};

export const remoteFileModel = {
  toExternal(file: RemoteFile): APIFileEntity | null {
    if (file.deleted) {
      return null;
    }
    return {
      cloudFileId: file.fileId,
      state: 'remote',
      groupId: file.groupId,
      name: file.name,
      encryptKeyId: file.encryptKeyId,
      hasKey: file.hasKey,
      owner: file.owner,
      usersWithAccess: file.usersWithAccess,
    };
  },

  fromExternal(file: APIFileEntity) {
    return { deleted: false, fileId: file.cloudFileId, ...file } as RemoteFile;
  },
};

export const budgetModel = {
  toExternal(file: Budget): APIFileEntity {
    return file as APIFileEntity;
  },

  fromExternal(file: APIFileEntity) {
    return file as Budget;
  },
};

export type AmountOPType = 'is' | 'isapprox' | 'isbetween';

export type APIScheduleEntity = Pick<
  ScheduleEntity,
  'id' | 'name' | 'posts_transaction'
> & {
  rule?: ScheduleEntity['rule']; //All schedules has an associated underlying rule. not to be supplied iwth a new schedule
  next_date?: ScheduleEntity['next_date']; //Next occurence of a schedule. not to be supplied iwth a new schedule
  completed?: ScheduleEntity['completed']; //not to be supplied with a new schedule
  payee?: ScheduleEntity['_payee']; // Optional will default to null
  account?: ScheduleEntity['_account']; // Optional will default to null
  amount?: ScheduleEntity['_amount']; // Provide only 1 number except if the Amount
  amountOp: AmountOPType; // 'is' | 'isapprox' | 'isbetween'
  date: ScheduleEntity['_date']; // mandatory field in creating a schedule Mandatory field in creation
};

export const scheduleModel = {
  toExternal(schedule: ScheduleEntity): APIScheduleEntity {
    return {
      id: schedule.id,
      name: schedule.name,
      rule: schedule.rule,
      next_date: schedule.next_date,
      completed: schedule.completed,
      posts_transaction: schedule.posts_transaction,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      amountOp: schedule._amountOp as 'is' | 'isapprox' | 'isbetween', // e.g. 'isapprox', 'is', etc.
      date: schedule._date,
    };
  },
  //just an update

  fromExternal(schedule: APIScheduleEntity): ScheduleEntity {
    const amount = schedule.amount ?? 0;
    const result: ScheduleEntity = {
      id: schedule.id,
      name: schedule.name,
      rule: String(schedule.rule),
      next_date: String(schedule.next_date),
      completed: Boolean(schedule.completed),
      posts_transaction: schedule.posts_transaction,
      tombstone: false,
      _payee: String(schedule.payee),
      _account: String(schedule.account),
      _amount: amount,
      _amountOp: schedule.amountOp, // e.g. 'isapprox', 'is', etc.
      _date: schedule.date,
      _conditions: [
        { op: 'is', field: 'payee', value: String(schedule.payee) },
        { op: 'is', field: 'account', value: String(schedule.account) },
        { op: 'isapprox', field: 'date', value: schedule.date },
        { op: schedule.amountOp, field: 'amount', value: amount },
      ],
      _actions: [], // empty array, as you requested
    };

    return result;
  },
};
