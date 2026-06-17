import type {
  ConditionalRule,
  ConditionalRuleCondition,
  ConditionalRuleStyling,
} from 'loot-core/types/chart-spec';

function evalCondition(
  condition: ConditionalRuleCondition,
  value: unknown,
): boolean {
  const { operator, value: ruleValue, valueMax } = condition;
  switch (operator) {
    case 'equals':
      return String(value) === String(ruleValue);
    case 'not_equals':
      return String(value) !== String(ruleValue);
    case 'greater_than': {
      const n = Number(value);
      const r = Number(ruleValue);
      return !isNaN(n) && !isNaN(r) && n > r;
    }
    case 'less_than': {
      const n = Number(value);
      const r = Number(ruleValue);
      return !isNaN(n) && !isNaN(r) && n < r;
    }
    case 'greater_than_or_equal': {
      const n = Number(value);
      const r = Number(ruleValue);
      return !isNaN(n) && !isNaN(r) && n >= r;
    }
    case 'less_than_or_equal': {
      const n = Number(value);
      const r = Number(ruleValue);
      return !isNaN(n) && !isNaN(r) && n <= r;
    }
    case 'between': {
      const n = Number(value);
      const r = Number(ruleValue);
      const rMax = Number(valueMax);
      return !isNaN(n) && !isNaN(r) && !isNaN(rMax) && n >= r && n <= rMax;
    }
    case 'is_null':
      return value === null || value === undefined;
    case 'is_not_null':
      return value !== null && value !== undefined;
    default:
      return false;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6 && cleaned.length !== 3) return null;
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map(c => c + c)
          .join('')
      : cleaned;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getColorScaleColor(
  value: number,
  min: number,
  max: number,
  minColor: string,
  maxColor: string,
): string {
  const minRgb = hexToRgb(minColor);
  const maxRgb = hexToRgb(maxColor);
  if (!minRgb || !maxRgb) return minColor;
  if (max === min) return minColor;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return rgbToHex({
    r: minRgb.r + (maxRgb.r - minRgb.r) * t,
    g: minRgb.g + (maxRgb.g - minRgb.g) * t,
    b: minRgb.b + (maxRgb.b - minRgb.b) * t,
  });
}

function mergeStyling(
  base: ConditionalRuleStyling,
  next: ConditionalRuleStyling,
): ConditionalRuleStyling {
  return {
    ...base,
    ...(next.textColor !== undefined ? { textColor: next.textColor } : {}),
    ...(next.backgroundColor !== undefined
      ? { backgroundColor: next.backgroundColor }
      : {}),
    ...(next.bold !== undefined ? { bold: next.bold } : {}),
    ...(next.italic !== undefined ? { italic: next.italic } : {}),
  };
}

export type ConditionalStyling = ConditionalRuleStyling & {
  formatEntireRow?: boolean;
};

export function evaluateConditionalFormat(
  fieldName: string,
  value: unknown,
  allValues: unknown[],
  rules: ConditionalRule[] | undefined,
): ConditionalStyling | null {
  if (!rules || rules.length === 0) return null;

  let merged: ConditionalStyling | null = null;
  for (const rule of rules) {
    if (rule.type === 'single_color' && rule.field === fieldName) {
      const matches = rule.conditions.every(c => evalCondition(c, value));
      if (matches) {
        const next: ConditionalStyling = {
          ...rule.styling,
          ...(rule.formatEntireRow ? { formatEntireRow: true } : {}),
        };
        merged = merged ? mergeStyling(merged, next) : next;
      }
    } else if (rule.type === 'color_scale' && rule.field === fieldName) {
      const numericValues = allValues
        .map(v => Number(v))
        .filter(v => !isNaN(v));
      if (numericValues.length === 0) continue;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const num = Number(value);
      if (isNaN(num)) continue;
      const color = getColorScaleColor(
        num,
        min,
        max,
        rule.invert ? rule.maxColor : rule.minColor,
        rule.invert ? rule.minColor : rule.maxColor,
      );
      const next: ConditionalStyling = { textColor: color };
      merged = merged ? mergeStyling(merged, next) : next;
    }
  }

  return merged;
}
