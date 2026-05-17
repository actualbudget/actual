import { shadeColor } from './DonutGraph';

describe('shadeColor', () => {
  it('shades hsl colors without falling back to black', () => {
    expect(shadeColor('hsl(228, 100%, 33%)', 0.15)).toBe('rgb(38, 67, 181)');
  });

  it('keeps unsupported color formats unchanged', () => {
    expect(shadeColor('currentColor', 0.15)).toBe('currentColor');
  });
});
