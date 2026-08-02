import type { TFunction } from 'i18next';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { translateBudgetTemplateNotification } from './mutations';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (!options) {
    return `translated:${key}`;
  }
  return `${key}:${JSON.stringify(options)}`;
}) as TFunction;

const pluralI18n = i18next.createInstance();
const pluralT = pluralI18n.t.bind(pluralI18n) as TFunction;
const cleanupAppliedMessage =
  'Successfully returned funds from $t(budget-template-source, {"count": {{sourceCount}}}) and funded $t(budget-template-sinking-fund, {"count": {{sinkCount}}}).';
const cleanupAppliedWithErrorsMessage = `${cleanupAppliedMessage} There were errors interpreting some templates:`;

beforeAll(async () => {
  await pluralI18n.init({
    lng: 'en',
    fallbackLng: false,
    resources: {
      en: {
        translation: {
          'budget-template-source_one': '{{count}} source',
          'budget-template-source_other': '{{count}} sources',
          'budget-template-sinking-fund_one': '{{count}} sinking fund',
          'budget-template-sinking-fund_other': '{{count}} sinking funds',
          [cleanupAppliedMessage]: cleanupAppliedMessage,
          [cleanupAppliedWithErrorsMessage]: cleanupAppliedWithErrorsMessage,
        },
      },
    },
    interpolation: { escapeValue: false },
  });
});

describe('translateBudgetTemplateNotification', () => {
  it('translates static budget template notification keys', () => {
    expect(
      translateBudgetTemplateNotification(
        { message: 'templates-check-passed' },
        t,
      ).message,
    ).toBe('translated:All templates passed! 🎉');
    expect(
      translateBudgetTemplateNotification({ message: 'template-errors' }, t)
        .message,
    ).toBe('translated:There were errors interpreting some templates:');
  });

  it('translates template notification counts', () => {
    expect(
      translateBudgetTemplateNotification(
        { message: 'templates-applied', count: 3 },
        t,
      ).message,
    ).toBe(
      'Successfully applied templates to {{count}} categories:{"count":3}',
    );
  });

  it('leaves non-template notifications unchanged', () => {
    expect(
      translateBudgetTemplateNotification({ message: 'Already translated' }, t)
        .message,
    ).toBe('Already translated');
  });

  it('translates cleanup notifications with i18next nesting', () => {
    const cases = [
      [
        0,
        0,
        'Successfully returned funds from 0 sources and funded 0 sinking funds.',
      ],
      [
        1,
        1,
        'Successfully returned funds from 1 source and funded 1 sinking fund.',
      ],
      [
        1,
        2,
        'Successfully returned funds from 1 source and funded 2 sinking funds.',
      ],
      [
        2,
        1,
        'Successfully returned funds from 2 sources and funded 1 sinking fund.',
      ],
      [
        2,
        2,
        'Successfully returned funds from 2 sources and funded 2 sinking funds.',
      ],
    ] as const;

    for (const [sourceCount, sinkCount, expected] of cases) {
      expect(
        translateBudgetTemplateNotification(
          { message: 'cleanup-applied', sourceCount, sinkCount },
          pluralT,
        ).message,
      ).toBe(expected);
    }

    expect(
      translateBudgetTemplateNotification(
        {
          message: 'cleanup-applied-with-errors',
          sourceCount: 1,
          sinkCount: 2,
        },
        pluralT,
      ).message,
    ).toBe(
      'Successfully returned funds from 1 source and funded 2 sinking funds. There were errors interpreting some templates:',
    );
  });
});
