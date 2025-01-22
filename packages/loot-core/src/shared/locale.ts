import { enUS } from 'date-fns/locale';

export const getLocale = async (language: string) => {
  const localeModule = await import(/* @vite-ignore */ `date-fns/locale`);
  try {
    const localeKey = language.replace('-', '') as keyof typeof localeModule;

    if (localeModule[localeKey]) {
      return localeModule[localeKey] as Locale;
    } else {
      return enUS;
    }
  } catch (error) {
    console.error(
      `Locale for language ${language} not found. Falling back to default.`,
    );
    return enUS;
  }
};
