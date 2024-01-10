export const adjustTextSize = (
  sized: number,
  type: string,
  width?: number,
): `${number}px` => {
  let source;
  switch (type) {
    case 'variable':
      const findArray = variableLookup.find(({ value }) => width < value).arr;
      source = findArray
        ? findArray
        : variableLookup[variableLookup.length - 1].arr;
      break;
    case 'donut':
      source = donutLookup;
      break;
    default:
      source = defaultLookup;
  }
  const lookup = source.find(({ size }) => sized <= size);
  const defaultLast = lookup ? lookup : source[source.length - 1];
  return `${defaultLast.font}px`;
};

const defaultLookup = [
  { size: 400, font: 12 },
  { size: 600, font: 14 },
  { size: null, font: 16 },
];

const donutLookup = [
  { size: 200, font: 12 },
  { size: 233, font: 14 },
  { size: 266, font: 16 },
  { size: 300, font: 18 },
  { size: null, font: 20 },
];

const variableLookup = [
  {
    value: 100,
    arr: [
      { size: 9, font: 10 },
      { size: 13, font: 11 },
      { size: 16, font: 12 },
      { size: 19, font: 13 },
      { size: 22, font: 14 },
      { size: 25, font: 15 },
      { size: null, font: 16 },
    ],
  },
  {
    value: 1000,
    arr: [
      { size: 23, font: 10 },
      { size: 26, font: 11 },
      { size: 29, font: 12 },
      { size: 32, font: 13 },
      { size: 35, font: 14 },
      { size: 38, font: 15 },
      { size: null, font: 16 },
    ],
  },
  {
    value: 10090,
    arr: [
      { size: 30, font: 10 },
      { size: 35, font: 11 },
      { size: 40, font: 12 },
      { size: 45, font: 13 },
      { size: 50, font: 14 },
      { size: 55, font: 15 },
      { size: null, font: 16 },
    ],
  },
  {
    value: null,
    arr: [
      { size: 36, font: 10 },
      { size: 42, font: 11 },
      { size: 48, font: 12 },
      { size: 54, font: 13 },
      { size: 60, font: 14 },
      { size: 66, font: 15 },
      { size: null, font: 16 },
    ],
  },
];
