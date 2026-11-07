import type {
  GroupedEntity,
  LegendEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { buildColorMap } from './donutColors';

const legend = (id: string, color: string): LegendEntity => ({
  name: id,
  id,
  color,
  dataKey: id,
});

const group = (id: string, categoryIds: string[]): GroupedEntity => ({
  id,
  name: id,
  intervalData: [],
  totalAssets: 0,
  totalDebts: 0,
  totalTotals: 0,
  netAssets: 0,
  netDebts: 0,
  totalBudgeted: 0,
  categories: categoryIds.map(catId => ({
    id: catId,
    name: catId,
    intervalData: [],
    totalAssets: 0,
    totalDebts: 0,
    totalTotals: 0,
    netAssets: 0,
    netDebts: 0,
    totalBudgeted: 0,
  })),
});

describe('buildColorMap', () => {
  it('keeps a hex group color and shades its categories progressively lighter', () => {
    const colors = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', '#5359fd')],
    );
    expect(colors.get('g1')).toBe('#5359fd');
    expect(colors.get('c1')).toBe('rgb(109, 114, 253)');
    expect(colors.get('c2')).toBe('rgb(137, 142, 254)');
    expect(colors.get('c3')).toBe('rgb(166, 169, 254)');
  });

  it('keeps an hsl group color and converts its shades to rgb', () => {
    const colors = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', 'hsl(237, 98%, 66%)')],
    );
    expect(colors.get('g1')).toBe('hsl(237, 98%, 66%)');
    // hsl(237, 98%, 66%) converts to rgb(83, 92, 253); first category shade is 0.15
    expect(colors.get('c1')).toBe('rgb(109, 116, 253)');
    expect(colors.get('c2')).toBe('rgb(137, 144, 254)');
    expect(colors.get('c3')).toBe('rgb(166, 171, 254)');
  });

  it('supports hsl space syntax and angle units', () => {
    const space = buildColorMap(
      [group('g1', ['c1'])],
      [legend('g1', 'hsl(237 98% 66%)')],
    );
    const deg = buildColorMap(
      [group('g2', ['c1'])],
      [legend('g2', 'hsla(237deg, 98%, 66%)')],
    );
    expect(space.get('c1')).toBe('rgb(109, 116, 253)');
    expect(deg.get('c1')).toBe('rgb(109, 116, 253)');
  });

  it('treats unitless hsl saturation and lightness as percentages', () => {
    const percent = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', 'hsl(237 98% 66%)')],
    );
    const unitless = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', 'hsl(237 98 66)')],
    );
    // group color passes through verbatim, so only the parsed shades compare
    expect(unitless.get('g1')).toBe('hsl(237 98 66)');
    expect(unitless.get('c1')).toBe(percent.get('c1'));
    expect(unitless.get('c2')).toBe(percent.get('c2'));
    expect(unitless.get('c3')).toBe(percent.get('c3'));
  });

  it('accepts a plus-signed hsl hue', () => {
    const plain = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', 'hsl(237, 98%, 66%)')],
    );
    const plus = buildColorMap(
      [group('g1', ['c1', 'c2', 'c3'])],
      [legend('g1', 'hsl(+237, 98%, 66%)')],
    );
    expect(plus.get('c1')).toBe(plain.get('c1'));
    expect(plus.get('c2')).toBe(plain.get('c2'));
    expect(plus.get('c3')).toBe(plain.get('c3'));
  });

  it('shades an rgb group color in comma and space syntax, ignoring alpha', () => {
    const comma = buildColorMap(
      [group('g1', ['c1'])],
      [legend('g1', 'rgb(255, 100, 50)')],
    );
    expect(comma.get('g1')).toBe('rgb(255, 100, 50)');
    expect(comma.get('c1')).toBe('rgb(255, 123, 81)');

    const space = buildColorMap(
      [group('g2', ['c1'])],
      [legend('g2', 'rgba(255 100 50 / 0.4)')],
    );
    expect(space.get('g2')).toBe('rgba(255 100 50 / 0.4)');
    expect(space.get('c1')).toBe('rgb(255, 123, 81)');
  });

  it('falls back to black shades for unparseable colors', () => {
    const colors = buildColorMap(
      [group('g1', ['c1'])],
      [legend('g1', 'not-a-color')],
    );
    expect(colors.get('g1')).toBe('not-a-color');
    expect(colors.get('c1')).toBe('rgb(38, 38, 38)');
  });
});
