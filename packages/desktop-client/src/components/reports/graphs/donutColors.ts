import type {
  GroupedEntity,
  LegendEntity,
} from '@actual-app/core/types/models';

const resolveCSSVariable = (color: string): string => {
  if (!color.startsWith('var(')) return color;
  const inner = color.slice(4, -1).trim();
  const varName = inner.split(',')[0].trim();
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const shadeColor = (resolvedHex: string, percent: number): string => {
  const { r, g, b } = hexToRgb(resolvedHex);
  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
};

/**
 * Colours for a group and category donut: each group keeps its legend colour
 * and its categories get lighter shades of it.
 */
export const buildColorMap = (
  groupedData: GroupedEntity[],
  legend: LegendEntity[],
): Map<string, string> => {
  const legendById = new Map(
    legend
      .filter(l => l.id != null)
      .map(l => [l.id, resolveCSSVariable(l.color)]),
  );

  return groupedData.reduce((acc, group) => {
    if (!group.id) return acc;

    const groupColor = legendById.get(group.id);
    if (!groupColor) return acc;

    acc.set(group.id, groupColor);

    // Fix 1: capture cats once to avoid group.categories.length on undefined
    const cats = group.categories ?? [];
    cats.forEach((cat, i) => {
      if (!cat.id) return;
      const shade = 0.15 + (i / Math.max(cats.length, 1)) * 0.5;
      acc.set(cat.id, shadeColor(groupColor, shade));
    });

    return acc;
  }, new Map<string, string>());
};
