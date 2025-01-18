import i18n from 'i18next';

import { setI18NextLanguage, availableLanguages } from './i18n';

vi.mock('i18next', () => {
  const i18nMock = {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    changeLanguage: vi.fn(),
  };
  return {
    default: i18nMock,
  };
});

vi.hoisted(vi.resetModules);

describe('setI18NextLanguage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(vi.unstubAllGlobals);

  test('should set system default language when no language is provided', () => {
    vi.stubGlobal('navigator', { language: 'fr' });

    setI18NextLanguage('');

    expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
  });

  test('should set the provided language if it is available', () => {
    const language = availableLanguages[0];

    setI18NextLanguage(language);

    expect(i18n.changeLanguage).toHaveBeenCalledWith(language);
  });

  test('should fallback to English if the provided language is unavailable', () => {
    vi.spyOn(console, 'error');

    setI18NextLanguage('unknown');

    expect(console.error).toHaveBeenCalledWith(
      'Unknown locale unknown, falling back to en',
    );
    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
  });

  test('should successfully use a language with a region code if it is known', () => {
    const language = 'pt-BR';

    setI18NextLanguage(language);

    expect(i18n.changeLanguage).toHaveBeenCalledWith(language);
  });

  test('should fallback to base language if the provided language has an unknown region code', () => {
    vi.spyOn(console, 'error');

    setI18NextLanguage('fr-ZZ');

    expect(console.error).toHaveBeenCalledWith(
      'Unknown locale fr-ZZ, falling back to fr',
    );
    expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
  });

  test('should fallback to lowercase language if the provided language has uppercase letters', () => {
    vi.spyOn(console, 'error');

    setI18NextLanguage('EN');

    expect(console.error).toHaveBeenCalledWith(
      'Unknown locale EN, falling back to en',
    );
    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
  });
});
