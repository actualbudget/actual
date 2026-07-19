import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
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
