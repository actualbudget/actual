import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('financialYearStart', () => {
  test('default starts on January 1st', () => {
    expect(monthUtils.financialYearStart('2024-05-15')).toBe('2024-01-01');
    expect(monthUtils.financialYearStart('2024-01-01')).toBe('2024-01-01');
  });

  test('starts on April 6th', () => {
    const start = '2025-04-06';
    // Before April 6th 2024 -> starts April 6th 2023
    expect(monthUtils.financialYearStart('2024-04-05', start)).toBe(
      '2023-04-06',
    );
    // On April 6th 2024 -> starts April 6th 2024
    expect(monthUtils.financialYearStart('2024-04-06', start)).toBe(
      '2024-04-06',
    );
    // After April 6th 2024 -> starts April 6th 2024
    expect(monthUtils.financialYearStart('2024-04-07', start)).toBe(
      '2024-04-06',
    );

    // Jan 1st 2024 -> starts April 6th 2023
    expect(monthUtils.financialYearStart('2024-01-01', start)).toBe(
      '2023-04-06',
    );
    // Dec 31st 2023 -> starts April 6th 2023
    expect(monthUtils.financialYearStart('2023-12-31', start)).toBe(
      '2023-04-06',
    );
    // Parses date objects correctly too
    expect(monthUtils.financialYearStart(new Date('2024-08-06'), start)).toBe(
      '2024-04-06',
    );
  });
});

describe('financialYearEnd', () => {
  test('default ends on December 31st', () => {
    expect(monthUtils.financialYearEnd('2024-05-15')).toBe('2024-12-31');
    expect(monthUtils.financialYearEnd('2024-12-31')).toBe('2024-12-31');
  });

  test('ends on April 5th (with April 6th start)', () => {
    const start = '2025-04-06';
    // Before April 6th 2024 -> ends April 5th 2024
    expect(monthUtils.financialYearEnd('2024-04-05', start)).toBe('2024-04-05');
    // On April 6th 2024 -> ends April 5th 2025
    expect(monthUtils.financialYearEnd('2024-04-06', start)).toBe('2025-04-05');
    // After April 6th 2024 -> ends April 5th 2025
    expect(monthUtils.financialYearEnd('2024-04-07', start)).toBe('2025-04-05');
    // Parses date objects correctly too
    expect(monthUtils.financialYearEnd(new Date('2024-08-06'), start)).toBe(
      '2025-04-05',
    );
  });
});
