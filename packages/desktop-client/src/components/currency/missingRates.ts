import * as monthUtils from '@actual-app/core/shared/months';
import type { Handlers } from '@actual-app/core/types/handlers';
import type { TFunction } from 'i18next';

export type MissingExchangeRates = Awaited<
  ReturnType<Handlers['exchange-rates-missing']>
>[number];

// One sentence per problem, e.g. "The last USD rate is from 10/20/2026."
export function describeMissingRates(
  missing: readonly MissingExchangeRates[],
  t: TFunction,
  dateFormat: string,
): string[] {
  const format = (date: string) => monthUtils.format(date, dateFormat);
  return missing.flatMap(
    ({ currency, isOutdated, outdatedSince, olderTransactionsFrom, holes }) => {
      if (isOutdated && !outdatedSince) {
        return [t('{{currency}} has no exchange rates yet.', { currency })];
      }
      const sentences: string[] = [];
      if (isOutdated && outdatedSince) {
        sentences.push(
          t('The last {{currency}} rate is from {{date}}.', {
            currency,
            date: format(outdatedSince),
          }),
        );
      }
      if (olderTransactionsFrom) {
        sentences.push(
          t(
            '{{currency}} transactions from {{from}} are older than its first rate.',
            { currency, from: format(olderTransactionsFrom) },
          ),
        );
      }
      if (holes && holes.startDate === holes.endDate) {
        sentences.push(
          t('The {{currency}} rate of {{date}} is missing.', {
            currency,
            date: format(holes.startDate),
          }),
        );
      } else if (holes) {
        sentences.push(
          t(
            'Some {{currency}} rates between {{from}} and {{to}} are missing.',
            {
              currency,
              from: format(holes.startDate),
              to: format(holes.endDate),
            },
          ),
        );
      }
      return sentences;
    },
  );
}
