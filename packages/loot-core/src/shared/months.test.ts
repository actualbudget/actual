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

test('isCurrentMonth accepts dates and Date objects', () => {
  const currentMonth = monthUtils.currentMonth();
  const previousMonth = monthUtils.prevMonth(currentMonth);

  expect(monthUtils.isCurrentMonth(currentMonth)).toBe(true);
  expect(monthUtils.isCurrentMonth(`${currentMonth}-15`)).toBe(true);
  expect(monthUtils.isCurrentMonth(monthUtils.parseDate(currentMonth))).toBe(
    true,
  );
  const [year, month] = currentMonth.split('-').map(Number);
  const overflowMonth = `${year - 1}-${String(month + 12).padStart(2, '0')}`;

  expect(monthUtils.isCurrentMonth(previousMonth)).toBe(false);
  expect(monthUtils.isCurrentMonth(`${previousMonth}-15`)).toBe(false);
  expect(monthUtils.isCurrentMonth(overflowMonth)).toBe(false);
  expect(monthUtils.isCurrentMonth('invalid')).toBe(false);
  expect(monthUtils.isCurrentMonth(new Date(Number.NaN))).toBe(false);
});

test('isCurrentDay accepts Date objects', () => {
  const currentDay = monthUtils.currentDay();
  const previousDay = monthUtils.subDays(currentDay, 1);
  const previousMonth = monthUtils.prevMonth(currentDay);
  const overflowDay = `${previousMonth}-${String(
    Number(monthUtils.lastDayOfMonth(previousMonth).slice(-2)) +
      Number(currentDay.slice(-2)),
  ).padStart(2, '0')}`;

  expect(monthUtils.isCurrentDay(currentDay)).toBe(true);
  expect(monthUtils.isCurrentDay(monthUtils.parseDate(currentDay))).toBe(true);
  expect(monthUtils.isCurrentDay(previousDay)).toBe(false);
  expect(monthUtils.isCurrentDay(overflowDay)).toBe(false);
  expect(monthUtils.isCurrentDay(monthUtils.parseDate(previousDay))).toBe(
    false,
  );
  expect(monthUtils.isCurrentDay('invalid')).toBe(false);
  expect(monthUtils.isCurrentDay(new Date(Number.NaN))).toBe(false);
});
