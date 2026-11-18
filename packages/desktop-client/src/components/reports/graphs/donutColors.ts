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

const hueUnits: Record<string, number> = {
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
};

const parseColor = (color: string): { r: number; g: number; b: number } => {
  let match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (match) {
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  }

  match = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(color);
  if (match) {
    return {
      r: parseInt(match[1] + match[1], 16),
      g: parseInt(match[2] + match[2], 16),
      b: parseInt(match[3] + match[3], 16),
    };
  }

  match = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (match) {
    const channels = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(v =>
        v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v),
      );
    if (channels.length === 3 && channels.every(Number.isFinite)) {
      return { r: channels[0], g: channels[1], b: channels[2] };
    }
  }

  match = /^hsla?\(([^)]+)\)$/i.exec(color);
  if (match) {
    const parts = match[1].split(/[\s,/]+/).filter(Boolean);
    const hue = /^([+-]?[\d.]+)(deg|grad|rad|turn)?$/i.exec(parts[0] ?? '');
    const parseChannel = (value?: string) => {
      // CSS saturation/lightness: unitless values share the 0-100 scale with %.
      const num = value == null ? NaN : parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };
    const saturation = parseChannel(parts[1]);
    const lightness = parseChannel(parts[2]);
    if (hue && saturation !== null && lightness !== null) {
      const unit = hueUnits[hue[2]?.toLowerCase() ?? 'deg'] ?? 1;
      const h = ((((parseFloat(hue[1]) * unit) % 360) + 360) % 360) / 360;
      const s = saturation / 100;
      const l = lightness / 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hueToRgb = (t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      return {
        r: Math.round(hueToRgb(h + 1 / 3) * 255),
        g: Math.round(hueToRgb(h) * 255),
        b: Math.round(hueToRgb(h - 1 / 3) * 255),
      };
    }
  }

  return { r: 0, g: 0, b: 0 };
};

const shadeColor = (color: string, percent: number): string => {
  const { r, g, b } = parseColor(color);
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
