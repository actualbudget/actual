export type DataEntity = {
  data: Array<ItemEntity>;
  monthData: Array<MonthData>;
  groupedData: Array<GroupedEntity>;
  legend: LegendEntity[];
  startDate: string;
  endDate: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
};

type LegendEntity = {
  name: string;
  color: string;
};

export type ItemEntity = {
  id: string;
  name: string;
  monthData: MonthData[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

export type MonthData = {
  date: string;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

/* this will be used in a future PR

export type GroupedEntity = {
  id: string;
  name: string;
  date?: string;
  monthData: Array<MonthData>;
  categories?: Array<ItemEntity>;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};
*/

export type Month = {
  month: string;
};
