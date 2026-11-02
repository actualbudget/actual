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
