import { enUS, ptBR } from 'date-fns/locale';

export function getLocale(language: string) {
  switch (language) {
    case 'pt-BR':
      return ptBR;

    default:
      return enUS;
  }
}
