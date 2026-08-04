import { categoryLists, ReportOptions } from './ReportOptions';

const translationState = vi.hoisted(() => ({ language: 'en' }));

vi.mock('i18next', () => ({
  t: (key: string) =>
    translationState.language === 'zh-Hans' ? `zh:${key}` : key,
}));
describe('ReportOptions', () => {
  beforeEach(() => {
    translationState.language = 'en';
  });

  it('translates option descriptions at access time', () => {
    expect(
      ReportOptions.balanceType.find(option => option.key === 'Payment')
        ?.description,
    ).toBe('Payment');

    translationState.language = 'zh-Hans';

    expect(
      ReportOptions.balanceType.find(option => option.key === 'Payment')
        ?.description,
    ).toBe('zh:Payment');
  });

  it('translates special categories when building category lists', () => {
    translationState.language = 'zh-Hans';

    const [categories, groups] = categoryLists({
      grouped: [],
      list: [],
    });

    expect(categories.map(category => category.name)).toEqual([
      'zh:Uncategorized',
      'zh:Off budget',
      'zh:Transfers',
    ]);
    expect(groups.at(-1)?.name).toBe('zh:Uncategorized & Off budget');
  });
});
