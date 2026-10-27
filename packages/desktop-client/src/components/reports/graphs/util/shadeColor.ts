type RGBA = { r: number; g: number; b: number; a: number };

const HEX_PATTERN = /^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i;
const FUNCTION_PATTERN = /^(rgba?|hsla?)\((.*)\)$/i;

/**
 * Lightens a color towards white by `percent` (0 = unchanged, 1 = white).
 * Accepts hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba() and
 * hsl()/hsla() colors. Alpha is preserved. Unsupported colors are returned
 * unchanged.
 */
export function shadeColor(color: string, percent: number): string {
  const rgba = parseColor(color);
  if (!rgba) return color;

  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  const [r, g, b] = [adjust(rgba.r), adjust(rgba.g), adjust(rgba.b)];
  return rgba.a < 1
    ? `rgba(${r}, ${g}, ${b}, ${Number(rgba.a.toFixed(3))})`
    : `rgb(${r}, ${g}, ${b})`;
}

export function parseColor(color: string): RGBA | null {
  const trimmed = color.trim();
  return parseHex(trimmed) ?? parseColorFunction(trimmed);
}

function parseHex(hex: string): RGBA | null {
  const match = HEX_PATTERN.exec(hex);
  if (!match) return null;

  let digits = match[1];
  // Expand shorthand (#rgb / #rgba) to the long form (#rrggbb / #rrggbbaa)
  if (digits.length <= 4) {
    digits = digits.replace(/./g, '$&$&');
  }

  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
    a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
  };
}

function parseColorFunction(color: string): RGBA | null {
  const match = FUNCTION_PATTERN.exec(color);
  if (!match) return null;

  // Supports both legacy `rgb(1, 2, 3, 0.5)` and modern `rgb(1 2 3 / 50%)`
  // syntax
  const [first, second, third, fourth] = match[2].trim().split(/[\s,/]+/);
  if (third === undefined) return null;

  const a = fourth === undefined ? 1 : parseAlpha(fourth);

  if (match[1].toLowerCase().startsWith('rgb')) {
    const rgba = {
      r: parseRgbChannel(first),
      g: parseRgbChannel(second),
      b: parseRgbChannel(third),
      a,
    };
    return Object.values(rgba).some(Number.isNaN) ? null : rgba;
  }

  const h = parseFloat(first);
  const s = parseFloat(second) / 100;
  const l = parseFloat(third) / 100;
  return [h, s, l, a].some(Number.isNaN) ? null : { ...hslToRgb(h, s, l), a };
}

function parseRgbChannel(value: string): number {
  return value.endsWith('%')
    ? (parseFloat(value) / 100) * 255
    : parseFloat(value);
}

function parseAlpha(value: string): number {
  const alpha = value.endsWith('%')
    ? parseFloat(value) / 100
    : parseFloat(value);
  return Math.min(1, Math.max(0, alpha));
}

// https://www.w3.org/TR/css-color-4/#hsl-to-rgb
function hslToRgb(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return { r: channel(0), g: channel(8), b: channel(4) };
}
