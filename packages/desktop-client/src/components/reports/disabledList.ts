const intervalOptions = [
  {
    description: 'Daily',
    defaultRange: 'This month',
  },
  {
    description: 'Weekly',
    defaultRange: 'Last 3 months',
  },
  {
    description: 'Monthly',
    defaultRange: 'Last 6 months',
  },
  {
    description: 'Yearly',
    defaultRange: 'Year to date',
  },
];

type graphOptions = {
  description: string;
  disabledSplit: string[];
  defaultSplit: string;
  disabledType: string[];
  defaultType: string;
  disableLegend?: boolean;
  disableLabel?: boolean;
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
  },
  {
    description: 'BarGraph',
    disabledSplit: [],
    defaultSplit: 'Category',
    disabledType: ['Net'],
    defaultType: 'Payment',
  },
  {
    description: 'AreaGraph',
    disabledSplit: ['Category', 'Group', 'Payee', 'Account'],
    defaultSplit: 'Interval',
    disabledType: [],
    defaultType: 'Payment',
    disableLegend: true,
  },
  {
    description: 'DonutGraph',
    disabledSplit: [],
    defaultSplit: 'Category',
    disabledType: ['Net'],
    defaultType: 'Payment',
  },
];

const timeGraphOptions: graphOptions[] = [
  {
    description: 'TableGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: [],
    defaultType: 'Payment',
    disableLegend: true,
    disableLabel: true,
  },
  {
    description: 'StackedBarGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: ['Net'],
    defaultType: 'Payment',
  },
  {
    description: 'LineGraph',
    disabledSplit: ['Interval'],
    defaultSplit: 'Category',
    disabledType: ['Net'],
    defaultType: 'Payment',
    disableLegend: false,
    disableLabel: true,
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
  type: 'defaultSplit' | 'defaultType',
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
};

export const defaultsList = {
  mode: modeOptions,
  modeGraphsMap: new Map(
    modeOptions.map(item => [item.description, item.defaultGraph]),
  ),
  intervalRange: new Map(
    intervalOptions.map(item => [item.description, item.defaultRange]),
  ),
};
