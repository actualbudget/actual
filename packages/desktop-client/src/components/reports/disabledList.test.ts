import { getIncludeCurrentState } from './disabledList';

describe('getIncludeCurrentState', () => {
  it('disables and unchecks Last month even when includeCurrentInterval is true', () => {
    expect(getIncludeCurrentState('Last month', false, true)).toEqual({
      disabled: true,
      checked: false,
    });
  });

  it('keeps active numeric ranges enabled when live', () => {
    expect(getIncludeCurrentState('Last 6 months', false, true)).toEqual({
      disabled: false,
      checked: true,
    });
    expect(getIncludeCurrentState('Last 6 months', true, true)).toEqual({
      disabled: true,
      checked: false,
    });
  });
});
