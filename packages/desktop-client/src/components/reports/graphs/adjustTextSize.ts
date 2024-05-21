export const adjustTextSize = ({
  sized,
  type,
  values = 0,
}: {
  sized: number;
  type: string;
  values?: number;
}): `${number}px` => {
  let source: {
    size: number;
    font: number;
  }[] = [{ size: -1, font: -1 }];
  switch (type) {
    case 'variable':
      const findLookup = variableLookup.find(({ value }) => values >= value);
      if (!findLookup) {
        break;
      }
      source = findLookup.arr;
      break;
    case 'donut':
      source = donutLookup;
      break;
    default:
      source = defaultLookup;
  }
  const findSource = source.find(({ size }) => sized >= size);
  if (!findSource) {
    return '13px';
  }

  return `${findSource.font}px`;
};

const defaultLookup = [
  { size: 600, font: 16 },
  { size: 500, font: 15 },
  { size: 400, font: 14 },
  { size: 300, font: 13 },
  { size: 200, font: 12 },
  { size: 100, font: 11 },
  { size: 0, font: 10 },
];

const donutLookup = [
  { size: 300, font: 20 },
  { size: 266, font: 18 },
  { size: 233, font: 16 },
  { size: 200, font: 14 },
  { size: 166, font: 12 },
  { size: 0, font: 10 },
];

const variableLookup = [
  {
    value: 10000,
    arr: [
      { size: 66, font: 16 },
      { size: 60, font: 15 },
      { size: 54, font: 14 },
      { size: 48, font: 13 },
      { size: 42, font: 12 },
      { size: 36, font: 11 },
      { size: 0, font: 10 },
    ],
  },
  {
    value: 1000,
    arr: [
      { size: 55, font: 16 },
      { size: 50, font: 15 },
      { size: 45, font: 14 },
      { size: 40, font: 13 },
      { size: 35, font: 12 },
      { size: 30, font: 11 },
      { size: 0, font: 10 },
    ],
  },
  {
    value: 100,
    arr: [
      { size: 38, font: 16 },
      { size: 35, font: 15 },
      { size: 32, font: 14 },
      { size: 29, font: 13 },
      { size: 26, font: 12 },
      { size: 23, font: 11 },
      { size: 0, font: 10 },
    ],
  },
  {
    value: 0,
    arr: [
      { size: 25, font: 16 },
      { size: 22, font: 15 },
      { size: 19, font: 14 },
      { size: 16, font: 13 },
      { size: 13, font: 12 },
      { size: 9, font: 11 },
      { size: 0, font: 10 },
    ],
  },
];
