import { t } from 'i18next';

import { type sortByOpType } from 'loot-core/types/models';

const intervalOptions = [
  {
    description: t('Daily'),
    key: 'Daily',
    defaultRange: 'This month',
  },
  {
    description: t('Weekly'),
    key: 'Weekly',
    defaultRange: 'Last 3 months',
  },
  {
    description: t('Monthly'),
    key: 'Monthly',
    defaultRange: 'Last 6 months',
  },
  {
    description: t('Yearly'),
    key: 'Yearly',
    defaultRange: 'Year to date',
  },
];

const currentIntervalOptions = [
  {
    description: t('This week'),
    disableInclude: true,
  },
  {
    description: t('This month'),
    disableInclude: true,
  },
  {
    description: t('Year to date'),
    disableInclude: true,
  },
  {
    description: t('Last year'),
    disableInclude: true,
  },
  {
    description: t('Prior year to date'),
    disableInclude: true,
  },
  {
    description: t('All time'),
    disableInclude: true,
  },
];

type graphOptions = {
  description: string;
  disabledSplit: string[];
  defaultSplit: string;
  disabledType: string[];
  defaultType: string;
  defaultSort: sortByOpType;
  disableLegend?: boolean;
  disableLabel?: boolean;
  disableSort?: boolean;
};
const totalGraphOptions: graphOptions[] = [
  {
    description: 'TableGraph',
    disabledSplit: [],
    defaultSplit: 'Category',
    disabledType: [],
    defaultType: 'Payment',
    disableLegend: true,
    disableLabel: true,
    defaultSort: 'budget',
  },
  {
    description: 'BarGraph',
    disabledSplit: [],
    defaultSplit: 'Category',
    disabledType: [],
    defaultType: 'Payment',
    defaultSort: 'desc',
  },
  {
    description: 'AreaGraph',
    disabledSplit: ['Category', 'Group', 'Payee', 'Account'],
    defaultSplit: 'Interval',
    disabledType: [],
    defaultType: 'Payment',
    disableLegend: true,
    disableSort: true,
    defaultSort: 'desc',
  },
  {
    description: 'DonutGraph',
    disabledSplit: [],
    defaultSplit: 'Category',
    disabledType: ['Net'],
    defaultType: 'Payment',
    defaultSort: 'desc',
  },
];

const timeGraphOptions: graphOptions[] = [
  {
    description: 'TableGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: ['Net Payment', 'Net Deposit'],
    defaultType: 'Payment',
    disableLegend: true,
    disableLabel: true,
    disableSort: true,
    defaultSort: 'desc',
  },
  {
    description: 'StackedBarGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: [],
    defaultType: 'Payment',
    disableSort: true,
    defaultSort: 'desc',
  },
  {
    description: 'LineGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: [],
    defaultType: 'Payment',
    disableLegend: false,
    disableLabel: true,
    disableSort: true,
    defaultSort: 'desc',
  },
];

const modeOptions = [
  {
    description: 'total',
    graphs: totalGraphOptions,
    disabledGraph: ['LineGraph'],
    defaultGraph: 'TableGraph',
  },
  {
    description: 'time',
    graphs: timeGraphOptions,
    disabledGraph: ['AreaGraph', 'DonutGraph'],
    defaultGraph: 'TableGraph',
  },
];

export function disabledGraphList(
  item: string,
  newGraph: string,
  type: 'disabledSplit' | 'disabledType',
) {
  const graphList = modeOptions.find(d => d.description === item);
  if (!graphList) {
    return [];
  }

  const disabledList = graphList.graphs.find(e => e.description === newGraph);
  if (!disabledList) {
    return [];
  }

  return disabledList[type];
}

export function disabledLegendLabel(
  item: string,
  newGraph: string,
  type: 'disableLegend' | 'disableLabel',
) {
  const graphList = modeOptions.find(d => d.description === item);
  if (!graphList) {
    return false;
  }

  const disableLegendLabel = graphList.graphs.find(
    e => e.description === newGraph,
  );
  if (!disableLegendLabel) {
    return false;
  }

  return disableLegendLabel[type];
}

export function defaultsGraphList(
  item: string,
  newGraph: string,
  type: 'defaultSplit' | 'defaultType' | 'defaultSort',
) {
  const graphList = modeOptions.find(d => d.description === item);
  if (!graphList) {
    return '';
  }

  const defaultItem = graphList.graphs.find(e => e.description === newGraph);
  if (!defaultItem) {
    return '';
  }

  return defaultItem[type];
}

export const disabledList = {
  mode: modeOptions,
  modeGraphsMap: new Map(
    modeOptions.map(item => [item.description, item.disabledGraph]),
  ),
  currentInterval: new Map(
    currentIntervalOptions.map(item => [item.description, item.disableInclude]),
  ),
};

export const defaultsList = {
  mode: modeOptions,
  modeGraphsMap: new Map(
    modeOptions.map(item => [item.description, item.defaultGraph]),
  ),
  intervalRange: new Map(
    intervalOptions.map(item => [item.key, item.defaultRange]),
  ),
};
