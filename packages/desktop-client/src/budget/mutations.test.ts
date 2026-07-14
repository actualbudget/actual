import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { translateBudgetTemplateNotification } from './mutations';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (!options) {
    return `translated:${key}`;
  }
  return `${key}:${JSON.stringify(options)}`;
}) as TFunction;

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
});
