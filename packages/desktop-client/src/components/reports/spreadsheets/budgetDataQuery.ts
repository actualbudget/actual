import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { type QueryDataEntity } from '@desktop-client/components/reports/ReportOptions';

export async function fetchBudgetData({
  startDate,
  endDate,
  interval,
  categories,
  categoryGroups,
}: {
  startDate: string;
  endDate: string;
  interval: string;
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
}): Promise<{ assets: QueryDataEntity[]; debts: QueryDataEntity[] }> {
  const groupById = new Map(categoryGroups.map(g => [g.id, g] as const));
  const assets: QueryDataEntity[] = [];
  const debts: QueryDataEntity[] = [];

  const months = monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  );

  for (const month of months) {
    const monthData = await send('envelope-budget-month', { month });
    const dateKey = interval === 'Yearly' ? month.slice(0, 4) : month;

    for (const cat of categories) {
      if (cat.is_income) {
        continue;
      }

      const budgetCell = monthData.find((cell: { name: string }) =>
        cell.name.endsWith(`budget-${cat.id}`),
      );

      const amount = Number(budgetCell?.value) || 0;
      if (amount === 0) {
        continue;
      }

      const group = cat.group ? groupById.get(cat.group) : undefined;

      const entry: QueryDataEntity = {
        date: dateKey,
        category: cat.id,
        categoryHidden: cat.hidden ?? false,
        categoryGroup: cat.group ?? '',
        categoryGroupHidden: group?.hidden ?? false,
        account: '',
        accountOffBudget: false,
        payee: '',
        transferAccount: '',
        amount,
      };

      if (amount > 0) {
        assets.push(entry);
      } else {
        debts.push(entry);
      }
    }
  }

  return { assets, debts };
}
