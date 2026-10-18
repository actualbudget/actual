import { isSupportedCurrencyCode } from '#shared/fx/currency';
import { MAX_EXCHANGE_RATE, MIN_EXCHANGE_RATE } from '#shared/fx/rates';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  ExchangeRateEntity,
  PayeeEntity,
} from '#types/models';

import {
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
  schema,
  schemaConfig,
} from './aql';
import type {
  DbAccount,
  DbAccountGroup,
  DbCategory,
  DbCategoryGroup,
  DbPayee,
} from './db';
import { ValidationError } from './errors';

export function requiredFields<T extends object, K extends keyof T>(
  name: string,
  row: T,
  fields: K[],
  update?: boolean,
) {
  fields.forEach(field => {
    if (update) {
      if (row.hasOwnProperty(field) && row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    } else {
      if (!row.hasOwnProperty(field) || row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    }
  });
}

export function toDateRepr(str: string) {
  if (typeof str !== 'string') {
    throw new Error('toDateRepr not passed a string: ' + str);
  }

  return parseInt(str.replace(/-/g, ''));
}

export function fromDateRepr(number: number) {
  if (typeof number !== 'number') {
    throw new Error('fromDateRepr not passed a number: ' + number);
  }

  const dateString = number.toString();
  return (
    dateString.slice(0, 4) +
    '-' +
    dateString.slice(4, 6) +
    '-' +
    dateString.slice(6)
  );
}

export const accountModel = {
  validate(account: Partial<DbAccount>, { update }: { update?: boolean } = {}) {
    requiredFields(
      'account',
      account,
      update ? ['name', 'offbudget', 'closed'] : ['name'],
      update,
    );

    if (
      account.currency != null &&
      !isSupportedCurrencyCode(account.currency)
    ) {
      throw new ValidationError(
        `account has an unsupported currency: ${account.currency}`,
      );
    }

    return account as DbAccount;
  },

  // Checks a currency an account is given on its own, e.g. when it changes.
  validateCurrency(currency: DbAccount['currency'] | undefined) {
    if (currency == null) {
      return;
    }
    if (!isSupportedCurrencyCode(currency)) {
      throw new ValidationError(
        `account has an unsupported currency: ${currency}`,
      );
    }
  },
};

function isValidDateString(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export const exchangeRateModel = {
  validate<T extends Partial<ExchangeRateEntity>>(exchangeRate: T): T {
    requiredFields<
      Partial<ExchangeRateEntity>,
      'from_currency' | 'to_currency' | 'rate' | 'date'
    >('exchangeRate', exchangeRate, [
      'from_currency',
      'to_currency',
      'rate',
      'date',
    ]);

    const { from_currency, to_currency, rate, date } = exchangeRate;
    for (const code of [from_currency, to_currency]) {
      if (code !== undefined && !isSupportedCurrencyCode(code)) {
        throw new ValidationError(
          `exchangeRate has an unsupported currency: ${code}`,
        );
      }
    }
    if (
      from_currency !== undefined &&
      to_currency !== undefined &&
      from_currency === to_currency
    ) {
      throw new ValidationError(
        'exchangeRate must convert between two different currencies',
      );
    }
    if (
      rate !== undefined &&
      (typeof rate !== 'number' ||
        !Number.isFinite(rate) ||
        rate < MIN_EXCHANGE_RATE ||
        rate > MAX_EXCHANGE_RATE)
    ) {
      throw new ValidationError(
        `exchangeRate must have a positive rate between 0.000000001 and 1000000000: ${String(rate)}`,
      );
    }
    if (date !== undefined && !isValidDateString(date)) {
      throw new ValidationError(
        `exchangeRate has an invalid date: ${String(date)}`,
      );
    }

    return exchangeRate;
  },
};

export const accountGroupModel = {
  validate<T extends Partial<DbAccountGroup>>(
    accountGroup: T,
    { update }: { update?: boolean } = {},
  ): Omit<T, 'sort_order'> {
    requiredFields<Partial<DbAccountGroup>, 'name'>(
      'accountGroup',
      accountGroup,
      ['name'],
      update,
    );

    const { sort_order: _sort_order, ...rest } = accountGroup;
    return rest;
  },
};

export const categoryModel = {
  validate(
    category: Partial<DbCategory>,
    { update }: { update?: boolean } = {},
  ): DbCategory {
    requiredFields(
      'category',
      category,
      update ? ['name', 'is_income', 'cat_group'] : ['name', 'cat_group'],
      update,
    );

    const { sort_order: _sort_order, ...rest } = category;
    return { ...rest } as DbCategory;
  },
  toDb(
    category: CategoryEntity,
    { update }: { update?: boolean } = {},
  ): DbCategory {
    return (
      update
        ? convertForUpdate(schema, schemaConfig, 'categories', category)
        : convertForInsert(schema, schemaConfig, 'categories', category)
    ) as DbCategory;
  },
  fromDb(category: DbCategory): CategoryEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'categories',
      category,
    ) as CategoryEntity;
  },
};

export const categoryGroupModel = {
  validate(
    categoryGroup: Partial<DbCategoryGroup>,
    { update }: { update?: boolean } = {},
  ): DbCategoryGroup {
    requiredFields(
      'categoryGroup',
      categoryGroup,
      update ? ['name', 'is_income'] : ['name'],
      update,
    );

    const { sort_order: _sort_order, ...rest } = categoryGroup;
    return { ...rest } as DbCategoryGroup;
  },
  toDb(
    categoryGroup: CategoryGroupEntity,
    { update }: { update?: boolean } = {},
  ): DbCategoryGroup {
    return (
      update
        ? convertForUpdate(
            schema,
            schemaConfig,
            'category_groups',
            categoryGroup,
          )
        : convertForInsert(
            schema,
            schemaConfig,
            'category_groups',
            categoryGroup,
          )
    ) as DbCategoryGroup;
  },
  fromDb(
    categoryGroup: DbCategoryGroup & {
      categories: DbCategory[];
    },
  ): CategoryGroupEntity {
    const { categories, ...rest } = categoryGroup;
    const categoryGroupEntity = convertFromSelect(
      schema,
      schemaConfig,
      'category_groups',
      rest,
    ) as CategoryGroupEntity;

    return {
      ...categoryGroupEntity,
      categories: categories
        .filter(category => category.cat_group === categoryGroup.id)
        .map(c => categoryModel.fromDb(c)),
    };
  },
};

export const payeeModel = {
  validate(payee: Partial<DbPayee>, { update }: { update?: boolean } = {}) {
    requiredFields('payee', payee, update ? [] : ['name'], update);
    return payee as DbPayee;
  },
  toDb(payee: PayeeEntity, { update }: { update?: boolean } = {}): DbPayee {
    return (
      update
        ? convertForUpdate(schema, schemaConfig, 'payees', payee)
        : convertForInsert(schema, schemaConfig, 'payees', payee)
    ) as DbPayee;
  },
  fromDb(payee: DbPayee): PayeeEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'payees',
      payee,
    ) as PayeeEntity;
  },
};
