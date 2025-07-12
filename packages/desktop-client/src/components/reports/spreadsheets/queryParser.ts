import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';

// Type definitions for better type safety
export type Category = {
  id: string;
  name: string;
};

export type Account = {
  id: string;
  name: string;
};

export type Payee = {
  id: string;
  name: string;
};

export type TransactionFilters = {
  category?: string;
  account?: string;
  payee?: string;
  notes?:
    | string
    | { $regexp: string }
    | { $and: Array<{ $regexp: string }> }
    | Array<{ $regexp: string }>;
  cleared?: boolean;
  reconciled?: boolean;
  transfer?: boolean;
  date?: {
    $gte?: string;
    $lt?: string;
    $lte?: string;
  };
  amount?: {
    $gte?: number;
    $lte?: number;
  };
};

export type ParsedQueryParams = {
  category?: string;
  account?: string;
  payee?: string;
  notes?: string;
  notesOp?: string;
  cleared?: boolean;
  reconciled?: boolean;
  transfer?: boolean;
  datePreset?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
};

/**
 * Extracts TransactionFilters from a query string (category, account, payee, notes, booleans, date)
 * This function converts names to IDs for database queries
 */
export async function parseQueryFilters(
  queryString: string,
): Promise<TransactionFilters> {
  const filters: TransactionFilters = {};

  // Extract category
  const categoryMatch = queryString.match(/category:\s*"([^"]+)"/);
  if (categoryMatch) {
    const categoryName = categoryMatch[1];
    const categories = await send('get-categories');
    let category = categories.list.find(
      (cat: Category) => cat.name === categoryName,
    );
    if (!category) {
      category = categories.list.find(
        (cat: Category) =>
          cat.name.toLowerCase() === categoryName.toLowerCase(),
      );
    }
    if (!category) {
      category = categories.list.find(
        (cat: Category) =>
          cat.name.includes(categoryName) || categoryName.includes(cat.name),
      );
    }
    if (category) {
      filters.category = category.id;
    } else {
      console.warn(
        'Category not found:',
        categoryName,
        'Available categories:',
        categories.list.map((c: Category) => c.name),
      );
    }
  }

  // Extract account filters
  const accountMatch = queryString.match(/account:\s*"([^"]+)"/);
  if (accountMatch) {
    const accountName = accountMatch[1];
    const accounts = await send('accounts-get');
    const account = accounts.find((acc: Account) => acc.name === accountName);
    if (account) {
      filters.account = account.id;
    } else {
      console.warn('Account not found (exact match):', accountName);
    }
  }

  // Extract payee filters
  const payeeMatch = queryString.match(/payee:\s*"([^"]+)"/);
  if (payeeMatch) {
    const payeeName = payeeMatch[1];
    const payees = await send('payees-get');
    const payee = payees.find((p: Payee) => p.name === payeeName);
    if (payee) {
      filters.payee = payee.id;
    } else {
      console.warn('Payee not found (exact match):', payeeName);
    }
  }

  // Extract notes filters
  const notesMatch = queryString.match(/notes:\s*([^\(]+)\(\s*"([^"]+)"\s*\)/);
  if (notesMatch) {
    const notesOp = notesMatch[1];
    const notesValue = notesMatch[2];
    if (notesOp === 'hasTags') {
      const words = notesValue.split(/\s+/);
      const tagValues: string[] = [];
      words.forEach(word => {
        const startsWithHash = word.startsWith('#');
        const containsMultipleHash = word.slice(1).includes('#');
        const correctlyFormatted = word.match(/#[\w\d\p{Emoji}-]+/gu);
        const validHashtag =
          startsWithHash && !containsMultipleHash && correctlyFormatted;
        if (validHashtag) tagValues.push(word);
      });
      if (tagValues.length > 0) {
        const tagRegexes = tagValues.map(tag => {
          const regex = new RegExp(
            `(^|\\s)${tag.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`,
          );
          return regex.source;
        });
        filters.notes = tagRegexes.map(regex => ({ $regexp: regex }));
      }
    } else if (notesOp === 'is') {
      filters.notes = notesValue;
    } else if (notesOp === 'contains') {
      filters.notes = {
        $regexp: notesValue.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'),
      };
    }
  } else {
    const notesSimpleMatch = queryString.match(/notes:\s*"([^"]+)"/);
    if (notesSimpleMatch) {
      filters.notes = notesSimpleMatch[1];
    }
  }

  // Extract boolean filters
  if (queryString.includes('cleared:true')) filters.cleared = true;
  else if (queryString.includes('cleared:false')) filters.cleared = false;
  if (queryString.includes('reconciled:true')) filters.reconciled = true;
  else if (queryString.includes('reconciled:false')) filters.reconciled = false;
  if (queryString.includes('transfer:true')) filters.transfer = true;
  else if (queryString.includes('transfer:false')) filters.transfer = false;

  // Extract date filters
  if (queryString.includes('date:thisMonth')) {
    filters.date = { $gte: monthUtils.currentMonth() + '-01' };
  } else if (queryString.includes('date:lastMonth')) {
    const lastMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
    filters.date = {
      $gte: lastMonth + '-01',
      $lt: monthUtils.currentMonth() + '-01',
    };
  } else if (queryString.includes('date:thisYear')) {
    const currentYear = monthUtils.currentYear();
    filters.date = { $gte: `${currentYear}-01-01` };
  } else if (queryString.includes('date:lastYear')) {
    const lastYear = parseInt(monthUtils.currentYear()) - 1;
    filters.date = { $gte: `${lastYear}-01-01`, $lt: `${lastYear + 1}-01-01` };
  } else {
    const dateBetweenMatch = queryString.match(
      /date:between\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/,
    );
    if (dateBetweenMatch) {
      filters.date = { $gte: dateBetweenMatch[1], $lte: dateBetweenMatch[2] };
    } else {
      const dateGteMatch = queryString.match(/date:gte\(\s*"([^"]+)"\s*\)/);
      if (dateGteMatch) filters.date = { $gte: dateGteMatch[1] };
      const dateLteMatch = queryString.match(/date:lte\(\s*"([^"]+)"\s*\)/);
      if (dateLteMatch)
        filters.date = { ...filters.date, $lte: dateLteMatch[1] };
    }
  }

  // Extract amount filters
  const amountGteMatch = queryString.match(/amount:gte\(\s*([^)]+)\s*\)/);
  if (amountGteMatch) {
    const minAmount = parseFloat(amountGteMatch[1]);
    filters.amount = { $gte: minAmount };
  }

  const amountLteMatch = queryString.match(/amount:lte\(\s*([^)]+)\s*\)/);
  if (amountLteMatch) {
    const maxAmount = parseFloat(amountLteMatch[1]);
    filters.amount = { ...filters.amount, $lte: maxAmount };
  }

  return filters;
}

/**
 * Extracts ParsedQueryParams from a query string (for UI purposes)
 * This function keeps names as strings for UI display
 */
export function parseQueryParams(queryString: string): ParsedQueryParams {
  const params: ParsedQueryParams = {};

  // Parse category:"value"
  const categoryMatch = queryString.match(/category:\s*"([^"]+)"/);
  if (categoryMatch) {
    params.category = categoryMatch[1];
  }

  // Parse account:"value"
  const accountMatch = queryString.match(/account:\s*"([^"]+)"/);
  if (accountMatch) {
    params.account = accountMatch[1];
  }

  // Parse payee:"value"
  const payeeMatch = queryString.match(/payee:\s*"([^"]+)"/);
  if (payeeMatch) {
    params.payee = payeeMatch[1];
  }

  // Parse notes filters
  const notesMatch = queryString.match(
    /notes:\s*(is|contains|hasTags)\(\s*"([^"]+)"\s*\)/,
  );
  if (notesMatch) {
    params.notesOp = notesMatch[1];
    params.notes = notesMatch[2];
  } else {
    const notesSimpleMatch = queryString.match(/notes:\s*"([^"]+)"/);
    if (notesSimpleMatch) {
      params.notesOp = 'is';
      params.notes = notesSimpleMatch[1];
    }
  }

  // Parse boolean filters
  if (queryString.includes('cleared:true')) {
    params.cleared = true;
  } else if (queryString.includes('cleared:false')) {
    params.cleared = false;
  }

  if (queryString.includes('reconciled:true')) {
    params.reconciled = true;
  } else if (queryString.includes('reconciled:false')) {
    params.reconciled = false;
  }

  if (queryString.includes('transfer:true')) {
    params.transfer = true;
  } else if (queryString.includes('transfer:false')) {
    params.transfer = false;
  }

  // Parse date filters
  if (queryString.includes('date:thisMonth')) {
    params.datePreset = 'thisMonth';
  } else if (queryString.includes('date:lastMonth')) {
    params.datePreset = 'lastMonth';
  } else if (queryString.includes('date:thisYear')) {
    params.datePreset = 'thisYear';
  } else if (queryString.includes('date:lastYear')) {
    params.datePreset = 'lastYear';
  } else {
    const dateBetweenMatch = queryString.match(
      /date:between\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/,
    );
    if (dateBetweenMatch) {
      params.datePreset = 'custom';
      params.startDate = dateBetweenMatch[1];
      params.endDate = dateBetweenMatch[2];
    } else {
      const dateGteMatch = queryString.match(/date:gte\(\s*"([^"]+)"\s*\)/);
      if (dateGteMatch) {
        params.datePreset = 'custom';
        params.startDate = dateGteMatch[1];
      }

      const dateLteMatch = queryString.match(/date:lte\(\s*"([^"]+)"\s*\)/);
      if (dateLteMatch) {
        params.datePreset = 'custom';
        params.endDate = dateLteMatch[1];
      }
    }
  }

  // Parse amount filters
  const amountGteMatch = queryString.match(
    /amount:gte\(\s*([+-]?\d+(?:\.\d+)?)\s*\)/,
  );
  if (amountGteMatch) {
    params.minAmount = (parseFloat(amountGteMatch[1]) / 100).toString();
  }

  const amountLteMatch = queryString.match(
    /amount:lte\(\s*([+-]?\d+(?:\.\d+)?)\s*\)/,
  );
  if (amountLteMatch) {
    params.maxAmount = (parseFloat(amountLteMatch[1]) / 100).toString();
  }

  return params;
}
