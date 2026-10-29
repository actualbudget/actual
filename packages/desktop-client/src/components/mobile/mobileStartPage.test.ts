import {
  getMobileStartPath,
  MOBILE_TAB_PAGES,
  parseMobileStartPage,
} from './mobileStartPage';

describe('parseMobileStartPage', () => {
  it.each([
    ['nothing is saved', undefined],
    ['the value is empty', ''],
    ['the page is unknown', 'garbage'],
    ['the page is not a tab bar page', 'payees'],
    ['the page is Settings', 'settings'],
    ['the value is a path', '/accounts'],
    ['the case is wrong', 'Accounts'],
    ['the value has whitespace', ' accounts '],
  ])('defaults to budget when %s', (_, raw) => {
    expect(parseMobileStartPage(raw)).toBe('budget');
  });

  it.each(MOBILE_TAB_PAGES)('keeps the saved $id page', ({ id }) => {
    expect(parseMobileStartPage(id)).toBe(id);
  });
});

describe('getMobileStartPath', () => {
  it('returns /budget for an unsupported value', () => {
    expect(getMobileStartPath(undefined)).toBe('/budget');
    expect(getMobileStartPath('garbage')).toBe('/budget');
  });

  it.each([
    ['budget', '/budget'],
    ['transaction', '/transactions/new'],
    ['accounts', '/accounts'],
    ['reports', '/reports'],
    ['schedules', '/schedules'],
  ])('returns the path of the %s page', (id, path) => {
    expect(getMobileStartPath(id)).toBe(path);
  });
});
