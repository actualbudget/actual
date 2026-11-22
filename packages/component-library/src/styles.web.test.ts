import { fadeColor, shadowColor } from './styles';

describe('fadeColor', () => {
  it('mixes the color with transparent at the given opacity', () => {
    expect(fadeColor('currentColor', 0.4)).toBe(
      'color-mix(in srgb, currentColor 40%, transparent)',
    );
  });
});

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
