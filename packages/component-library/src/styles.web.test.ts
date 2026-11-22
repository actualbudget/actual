import { shadowColor } from './styles';

describe('shadowColor', () => {
  it('fades the theme shadow color to the given opacity', () => {
    expect(shadowColor(0.2)).toBe(
      'color-mix(in srgb, var(--color-shadow) 20%, transparent)',
    );
  });

  it('rounds the percentage to a whole number', () => {
    expect(shadowColor(0.11)).toBe(
      'color-mix(in srgb, var(--color-shadow) 11%, transparent)',
    );
  });
});
