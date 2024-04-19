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

const totalGraphOptions = [
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

const timeGraphOptions = [
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

export const disabledList = {
  mode: modeOptions,
  modeGraphsMap: new Map(
    modeOptions.map(item => [item.description, item.disabledGraph]),
  ),
  graphSplitMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.disabledSplit])),
    ]),
  ),
  graphTypeMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.disabledType])),
    ]),
  ),
  graphLegendMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.disableLegend])),
    ]),
  ),
  graphLabelsMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.disableLabel])),
    ]),
  ),
};

export const defaultsList = {
  mode: modeOptions,
  modeGraphsMap: new Map(
    modeOptions.map(item => [item.description, item.defaultGraph]),
  ),
  graphSplitMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.defaultSplit])),
    ]),
  ),
  graphTypeMap: new Map(
    modeOptions.map(item => [
      item.description,
      new Map([...item.graphs].map(f => [f.description, f.defaultType])),
    ]),
  ),
  intervalRange: new Map(
    intervalOptions.map(item => [item.description, item.defaultRange]),
  ),
};
