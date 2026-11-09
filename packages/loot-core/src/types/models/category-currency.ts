import type { CategoryEntity } from './category';

// A currency budgeted on its own line in a category. Spending of accounts in
// that currency shows up in it, in that currency, from `start_month` on.
export type CategoryCurrencyEntity = {
  // `${category}-${currency}`, so a currency added on two devices is one line
  id: string;
  category: CategoryEntity['id'];
  currency: string;
  // 'YYYY-MM', or null for every month
  start_month: string | null;
  // A line that exists only because its currency is budgeted on its own and
  // the category has spending in it; it is stored once it gets a budget
  automatic?: boolean;
};
