import {
  getMobileStartPath,
  MOBILE_START_PAGE_IDS,
  parseMobileStartPage,
} from './mobileStartPage';

describe('parseMobileStartPage', () => {
  it('defaults to budget when nothing is saved', () => {
    expect(parseMobileStartPage(undefined)).toBe('budget');
  });

  it('defaults to budget for an empty value', () => {
    expect(parseMobileStartPage('')).toBe('budget');
  });

  it('defaults to budget for an unknown or unsupported page', () => {
    expect(parseMobileStartPage('garbage')).toBe('budget');
    expect(parseMobileStartPage('payees')).toBe('budget');
    expect(parseMobileStartPage('settings')).toBe('budget');
    expect(parseMobileStartPage('/accounts')).toBe('budget');
    expect(parseMobileStartPage('/transactions/new')).toBe('budget');
  });

  it('does not match values with the wrong case or whitespace', () => {
    expect(parseMobileStartPage('Accounts')).toBe('budget');
    expect(parseMobileStartPage('REPORTS')).toBe('budget');
    expect(parseMobileStartPage(' accounts ')).toBe('budget');
  });

  it.each(MOBILE_START_PAGE_IDS)('keeps the saved %s page', id => {
    expect(parseMobileStartPage(id)).toBe(id);
  });
});

describe('getMobileStartPath', () => {
  it('returns /budget when nothing is saved', () => {
    expect(getMobileStartPath(undefined)).toBe('/budget');
  });

  it('returns /budget for an empty value', () => {
    expect(getMobileStartPath('')).toBe('/budget');
  });

  it('returns /budget for an unknown or unsupported page', () => {
    expect(getMobileStartPath('garbage')).toBe('/budget');
    expect(getMobileStartPath('payees')).toBe('/budget');
    expect(getMobileStartPath('settings')).toBe('/budget');
  });

  it('returns /budget for values with the wrong case', () => {
    expect(getMobileStartPath('Accounts')).toBe('/budget');
  });

  it('returns the path of each supported page', () => {
    expect(getMobileStartPath('budget')).toBe('/budget');
    expect(getMobileStartPath('transaction')).toBe('/transactions/new');
    expect(getMobileStartPath('accounts')).toBe('/accounts');
    expect(getMobileStartPath('reports')).toBe('/reports');
    expect(getMobileStartPath('schedules')).toBe('/schedules');
  });

  it('offers the pages in the same order as the mobile tab bar', () => {
    expect(MOBILE_START_PAGE_IDS).toEqual([
      'budget',
      'transaction',
      'accounts',
      'reports',
      'schedules',
    ]);
  });
});
