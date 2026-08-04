import { zhCN, zhTW, zhHK, enUS, ptBR, de, nb } from 'date-fns/locale';

import { getLocale } from './locale';

describe('getLocale', () => {
  it('maps common BCP-47 tags to date-fns locales', () => {
    expect(getLocale('en-US')).toBe(enUS);
    expect(getLocale('pt-BR')).toBe(ptBR);
    expect(getLocale('pt_BR')).toBe(ptBR);
    expect(getLocale('de')).toBe(de);
    expect(getLocale('nb-NO')).toBe(nb);
  });

  it('maps Chinese script/region tags to zhCN / zhTW / zhHK', () => {
    expect(getLocale('zh-Hans')).toBe(zhCN);
    expect(getLocale('zh-CN')).toBe(zhCN);
    expect(getLocale('zh')).toBe(zhCN);
    expect(getLocale('ZH-HANS')).toBe(zhCN);
    expect(getLocale('zh_CN')).toBe(zhCN);
    expect(getLocale('zh-Hant')).toBe(zhTW);
    expect(getLocale('zh-TW')).toBe(zhTW);
    expect(getLocale('zh-HK')).toBe(zhHK);
  });

  it('falls back safely for invalid input', () => {
    expect(getLocale('')).toBe(enUS);
    expect(getLocale(null)).toBe(enUS);
    expect(getLocale(undefined)).toBe(enUS);
    expect(getLocale('not-a-locale')).toBe(enUS);
    // @ts-expect-error intentional invalid type
    expect(getLocale(123)).toBe(enUS);
  });
});
