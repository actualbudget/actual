import { AccountEntity, RuleConditionEntity } from 'loot-core/types/models';
import { useSpreadsheet } from 'loot-core/client/SpreadsheetProvider';

export function createSpreadsheet(
  start: string,
  end: string,
  accounts: AccountEntity[],
  conditions: RuleConditionEntity[] = [],
  conditionsOp: 'and' | 'or' = 'and',
) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: ReturnType<typeof recalculate>) => void,
  ) => {
    const data = await Promise.all(
      accounts.map(async acct => {
        return {
          id: acct.id,
          balances: ['10-10-2024', 20],
          starting: 100,
        };
      }),
    );
    setData(recalculate(data, start, end));
  };
}

function recalculate(data: any, start: string, end: string) {
  const ret: Array<{
    x: string;
    y: number;
    assets: string;
    debt: string;
    change: string;
    networth: string;
    date: string;
  }> = [];

  return {
    graphData: {
      data: ret,
      start,
      end,
    },
  };
}
