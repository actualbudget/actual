import React from 'react';
import { MemoryRouter } from 'react-router';

import type {
  DataEntity,
  GroupedEntity,
  LegendEntity,
} from '@actual-app/core/types/models';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestProviders } from '#mocks';

import {
  buildColorMap,
  colorToRgb,
  DonutGraph,
  hslToRgb,
  shadeColor,
} from './DonutGraph';

describe('DonutGraph Color Helpers', () => {
  describe('hslToRgb', () => {
    it('converts primary hues correctly', () => {
      expect(hslToRgb(0, 1, 0.5)).toEqual({ r: 255, g: 0, b: 0 }); // Red
      expect(hslToRgb(120, 1, 0.5)).toEqual({ r: 0, g: 255, b: 0 }); // Green
      expect(hslToRgb(240, 1, 0.5)).toEqual({ r: 0, g: 0, b: 255 }); // Blue
    });

    it('converts black and white correctly', () => {
      expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 }); // Black
      expect(hslToRgb(0, 0, 1)).toEqual({ r: 255, g: 255, b: 255 }); // White
    });

    it('normalizes degrees exceeding 360 or negative', () => {
      expect(hslToRgb(360 + 120, 1, 0.5)).toEqual({ r: 0, g: 255, b: 0 });
      expect(hslToRgb(-120, 1, 0.5)).toEqual({ r: 0, g: 0, b: 255 });
    });
  });

  describe('colorToRgb', () => {
    it('parses 6-digit hex colors', () => {
      expect(colorToRgb('#5359fd')).toEqual({ r: 83, g: 89, b: 253 });
      expect(colorToRgb('5359fd')).toEqual({ r: 83, g: 89, b: 253 });
    });

    it('parses 3-digit and 4-digit hex colors', () => {
      expect(colorToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(colorToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(colorToRgb('#f00f')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 8-digit hex colors', () => {
      expect(colorToRgb('#00ff00ff')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('parses rgb and rgba colors with integer values', () => {
      expect(colorToRgb('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
      expect(colorToRgb('rgba(10, 20, 30, 0.8)')).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
    });

    it('parses rgb and rgba colors with percentages', () => {
      expect(colorToRgb('rgb(100%, 0%, 0%)')).toEqual({ r: 255, g: 0, b: 0 });
      expect(colorToRgb('rgb(100%, 100%, 100%)')).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
      expect(colorToRgb('rgba(0%, 50%, 100%, 0.5)')).toEqual({
        r: 0,
        g: 128,
        b: 255,
      });
    });

    it('parses hsl and hsla colors', () => {
      expect(colorToRgb('hsl(210, 100%, 50%)')).toEqual({
        r: 0,
        g: 128,
        b: 255,
      });
      expect(colorToRgb('hsl(237, 51%, 23%)')).toEqual({
        r: 29,
        g: 32,
        b: 89,
      });
      expect(colorToRgb('hsla(120, 100%, 50%, 0.5)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
    });

    it('handles negative hues, units, and whitespace in hsl', () => {
      expect(colorToRgb('hsl(120deg, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(colorToRgb('hsl(210 100 50)')).toEqual({
        r: 0,
        g: 128,
        b: 255,
      });
      expect(colorToRgb('hsl(-120, 100%, 50%)')).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
      expect(colorToRgb('hsl(-120deg, 100%, 50%)')).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
      expect(colorToRgb('hsl(0.5turn, 100%, 50%)')).toEqual({
        r: 0,
        g: 255,
        b: 255,
      });
      expect(colorToRgb('  hsl( 0 , 100% , 50% )  ')).toEqual({
        r: 255,
        g: 0,
        b: 0,
      });
    });

    it('returns black fallback for empty, non-string, or unparseable input', () => {
      expect(colorToRgb('')).toEqual({ r: 0, g: 0, b: 0 });
      expect(colorToRgb(null as unknown as string)).toEqual({
        r: 0,
        g: 0,
        b: 0,
      });
      expect(colorToRgb(undefined as unknown as string)).toEqual({
        r: 0,
        g: 0,
        b: 0,
      });
      expect(colorToRgb('invalid-color')).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('shadeColor', () => {
    it('shades hex colors toward white', () => {
      const original = colorToRgb('#5359fd');
      const shaded = shadeColor('#5359fd', 0.5);
      expect(shaded).toBe('rgb(169, 172, 254)');
      // Shaded channels should be brighter than original
      const parsedShaded = colorToRgb(shaded);
      expect(parsedShaded.r).toBeGreaterThan(original.r);
      expect(parsedShaded.g).toBeGreaterThan(original.g);
    });

    it('shades hsl colors without returning black (#7820 regression)', () => {
      const hsl = 'hsl(210, 100%, 50%)';
      const shaded = shadeColor(hsl, 0.3);
      const { r, g, b } = colorToRgb(shaded);
      // Previously, hexToRgb returned {r:0, g:0, b:0}, producing black/near-black
      // With the fix, the base blue is preserved and lightened
      expect(b).toBe(255);
      expect(g).toBeGreaterThan(128);
      expect(r).toBeGreaterThan(0);
    });

    it('returns unparseable color unchanged without falling back to black', () => {
      expect(shadeColor('var(--custom-unresolved)', 0.3)).toBe(
        'var(--custom-unresolved)',
      );
      expect(shadeColor('invalid-color', 0.5)).toBe('invalid-color');
    });
  });

  describe('buildColorMap', () => {
    it('builds color map for grouped categories using hsl colors', () => {
      const groupedData: GroupedEntity[] = [
        {
          id: 'group-1',
          name: 'Bills',
          totalAssets: 0,
          totalDebts: 0,
          totalTotals: 0,
          netAssets: 0,
          netDebts: 0,
          totalBudgeted: 0,
          intervalData: [],
          categories: [
            {
              id: 'cat-1',
              name: 'Rent',
              totalAssets: 0,
              totalDebts: 0,
              totalTotals: 0,
              netAssets: 0,
              netDebts: 0,
              totalBudgeted: 0,
              intervalData: [],
            },
            {
              id: 'cat-2',
              name: 'Utilities',
              totalAssets: 0,
              totalDebts: 0,
              totalTotals: 0,
              netAssets: 0,
              netDebts: 0,
              totalBudgeted: 0,
              intervalData: [],
            },
          ],
        },
      ];
      const legend: LegendEntity[] = [
        {
          id: 'group-1',
          name: 'Bills',
          color: 'hsl(210, 100%, 50%)',
          dataKey: 'group-1',
        },
      ];

      const colorMap = buildColorMap(groupedData, legend);

      expect(colorMap.get('group-1')).toBe('hsl(210, 100%, 50%)');
      const cat1Color = colorMap.get('cat-1');
      const cat2Color = colorMap.get('cat-2');

      expect(cat1Color).toBeDefined();
      expect(cat2Color).toBeDefined();
      // Ensure neither category gets black/near-black
      const cat1Rgb = colorToRgb(cat1Color!);
      const cat2Rgb = colorToRgb(cat2Color!);
      expect(cat1Rgb.b).toBeGreaterThan(200);
      expect(cat2Rgb.b).toBeGreaterThan(200);
    });
  });
});

describe('DonutGraph Component', () => {
  it('renders concentric donut chart with hsl colors without throwing', () => {
    const sampleData: DataEntity = {
      groupedData: [
        {
          id: 'group-1',
          name: 'Food',
          totalAssets: 0,
          totalDebts: 0,
          totalTotals: 0,
          netAssets: 0,
          netDebts: 0,
          totalBudgeted: 0,
          intervalData: [],
          categories: [
            {
              id: 'cat-1',
              name: 'Groceries',
              totalAssets: 0,
              totalDebts: 0,
              totalTotals: 300,
              netAssets: 0,
              netDebts: 0,
              totalBudgeted: 0,
              intervalData: [],
            },
            {
              id: 'cat-2',
              name: 'Dining',
              totalAssets: 0,
              totalDebts: 0,
              totalTotals: 150,
              netAssets: 0,
              netDebts: 0,
              totalBudgeted: 0,
              intervalData: [],
            },
          ],
        },
      ],
      intervalData: [],
      totalAssets: 0,
      totalDebts: 0,
      netAssets: 0,
      netDebts: 0,
      totalTotals: 450,
      totalBudgeted: 0,
      legend: [
        {
          id: 'group-1',
          name: 'Food',
          color: 'hsl(120, 80%, 40%)',
          dataKey: 'group-1',
        },
      ],
    };

    render(
      <MemoryRouter>
        <TestProviders>
          <DonutGraph
            data={sampleData}
            groupBy="CategoryGroup"
            filters={[]}
            balanceTypeOp="totalTotals"
            viewLabels={false}
          />
        </TestProviders>
      </MemoryRouter>,
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
