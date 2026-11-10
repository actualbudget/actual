import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

test('getQuarter returns the quarter number for a given month', () => {
  expect(monthUtils.getQuarter('2024-01')).toBe(1);
  expect(monthUtils.getQuarter('2024-03')).toBe(1);
  expect(monthUtils.getQuarter('2024-04')).toBe(2);
  expect(monthUtils.getQuarter('2024-06')).toBe(2);
  expect(monthUtils.getQuarter('2024-07')).toBe(3);
  expect(monthUtils.getQuarter('2024-09')).toBe(3);
  expect(monthUtils.getQuarter('2024-10')).toBe(4);
  expect(monthUtils.getQuarter('2024-12')).toBe(4);
});

test('getQuarterStart and getQuarterEnd return the bounding months of the quarter', () => {
  expect(monthUtils.getQuarterStart('2024-02')).toBe('2024-01');
  expect(monthUtils.getQuarterEnd('2024-02')).toBe('2024-03');
  expect(monthUtils.getQuarterStart('2024-11')).toBe('2024-10');
  expect(monthUtils.getQuarterEnd('2024-11')).toBe('2024-12');
});

test('quarterFromDate keys a date by the first month of its quarter', () => {
  expect(monthUtils.quarterFromDate('2024-01-01')).toBe('2024-01');
  expect(monthUtils.quarterFromDate('2024-03-31')).toBe('2024-01');
  expect(monthUtils.quarterFromDate('2024-05')).toBe('2024-04');
  expect(monthUtils.quarterFromDate('2024-12-15')).toBe('2024-10');
});

test('quarterRangeInclusive lists every quarter touched by the range', () => {
  expect(monthUtils.quarterRangeInclusive('2023-11-15', '2024-05-01')).toEqual([
    '2023-10',
    '2024-01',
    '2024-04',
  ]);
  expect(monthUtils.quarterRangeInclusive('2024-02', '2024-03')).toEqual([
    '2024-01',
  ]);
});

test('currentQuarter returns the first month of the current quarter', () => {
  // In test mode, currentMonth() returns '2017-01'
  expect(monthUtils.currentQuarter()).toBe('2017-01');
});

test('prevQuarter subtracts three months, landing in the previous quarter', () => {
  expect(monthUtils.prevQuarter('2024-02')).toBe('2023-11');
  expect(monthUtils.prevQuarter('2024-01')).toBe('2023-10');
  expect(monthUtils.prevQuarter('2024-04')).toBe('2024-01');
});

test('isValidYearMonthDay validates the day against the month and year', () => {
  expect(monthUtils.isValidYearMonthDay('2024-02-29')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2023-02-29')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-04-31')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-12-31')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2024-00-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-13-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02-00')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02')).toBe(false);
});

test('isCurrentMonth matches valid local dates in the current month', () => {
  expect(monthUtils.isCurrentMonth('2017-01')).toBe(true);
  expect(monthUtils.isCurrentMonth('2017-01-15')).toBe(true);
  expect(monthUtils.isCurrentMonth(new Date(2017, 0, 15, 12))).toBe(true);
  expect(monthUtils.isCurrentMonth('2016-12')).toBe(false);
  expect(monthUtils.isCurrentMonth(new Date(2016, 11, 31, 12))).toBe(false);
  expect(monthUtils.isCurrentMonth('2016-13')).toBe(false);
  expect(monthUtils.isCurrentMonth('2016-12-32')).toBe(false);
  expect(monthUtils.isCurrentMonth('invalid')).toBe(false);
  expect(monthUtils.isCurrentMonth(new Date(Number.NaN))).toBe(false);
});

test('isCurrentDay matches valid local dates on the current day', () => {
  expect(monthUtils.isCurrentDay('2017-01-01')).toBe(true);
  expect(monthUtils.isCurrentDay(new Date(2017, 0, 1, 12))).toBe(true);
  expect(monthUtils.isCurrentDay('2016-12-31')).toBe(false);
  expect(monthUtils.isCurrentDay(new Date(2016, 11, 31, 12))).toBe(false);
  expect(monthUtils.isCurrentDay('2017-01')).toBe(false);
  expect(monthUtils.isCurrentDay('2016-12-32')).toBe(false);
  expect(monthUtils.isCurrentDay('invalid')).toBe(false);
  expect(monthUtils.isCurrentDay(new Date(Number.NaN))).toBe(false);
});
