import type { Template } from '@actual-app/core/types/models/templates';
import { describe, expect, it } from 'vitest';

import { setTemplate, updateTemplate } from './actions';
import { getInitialState, templateReducer } from './reducer';

const average: Template = {
  type: 'average',
  numMonths: 3,
  directive: 'template',
  priority: 1,
};

describe('weekly average defaults', () => {
  it('uses 12 weeks when switching into weekly mode', () => {
    const state = templateReducer(
      getInitialState(average),
      updateTemplate({ type: 'weeklyAverage' }),
    );

    expect(state.template).toMatchObject({
      type: 'weeklyAverage',
      numWeeks: 12,
    });
  });

  it.each([
    ['drops a fixed', 'fixed', undefined],
    ['keeps a percentage', 'percent', 10],
  ] as const)(
    '%s adjustment when switching into weekly mode',
    (_, adjustmentType, expected) => {
      const state = templateReducer(
        getInitialState({ ...average, adjustment: 10, adjustmentType }),
        updateTemplate({ type: 'weeklyAverage' }),
      );

      expect(state.template).toMatchObject({ type: 'weeklyAverage' });
      expect(
        'adjustment' in state.template ? state.template.adjustment : undefined,
      ).toBe(expected);
    },
  );

  it('keeps the number of weeks on a saved weekly automation', () => {
    const state = templateReducer(
      getInitialState(average),
      setTemplate({
        type: 'weeklyAverage',
        numWeeks: 4,
        weekday: 'friday',
        directive: 'template',
        priority: 1,
      }),
    );

    expect(state.template).toMatchObject({ numWeeks: 4, weekday: 'friday' });
  });
});
