type RGB = { r: number; g: number; b: number };

const HEX_PATTERN = /^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i;
const FUNCTION_PATTERN = /^(rgba?|hsla?)\((.*)\)$/i;

/**
 * Lightens a color towards white by `percent` (0 = unchanged, 1 = white).
 * Accepts hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba() and
 * hsl()/hsla() colors. Unsupported colors are returned unchanged.
 */
export function shadeColor(color: string, percent: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;

  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * percent)));
  return `rgb(${adjust(rgb.r)}, ${adjust(rgb.g)}, ${adjust(rgb.b)})`;
}

export function parseColor(color: string): RGB | null {
  const trimmed = color.trim();
  return parseHex(trimmed) ?? parseColorFunction(trimmed);
}

function parseHex(hex: string): RGB | null {
  const match = HEX_PATTERN.exec(hex);
  if (!match) return null;

  let digits = match[1];
  // Expand shorthand (#rgb / #rgba) to the long form (#rrggbb / #rrggbbaa)
  if (digits.length <= 4) {
    digits = digits.replace(/./g, '$&$&');
  }

  // Any alpha channel (last two digits) is ignored
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

function parseColorFunction(color: string): RGB | null {
  const match = FUNCTION_PATTERN.exec(color);
  if (!match) return null;

  // Supports both legacy `rgb(1, 2, 3)` and modern `rgb(1 2 3 / 50%)` syntax;
  // any alpha component is ignored.
  const [first, second, third] = match[2].trim().split(/[\s,/]+/);
  if (third === undefined) return null;

  if (match[1].toLowerCase().startsWith('rgb')) {
    const rgb = {
      r: parseRgbChannel(first),
      g: parseRgbChannel(second),
      b: parseRgbChannel(third),
    };
    return Object.values(rgb).some(Number.isNaN) ? null : rgb;
  }

  const h = parseFloat(first);
  const s = parseFloat(second) / 100;
  const l = parseFloat(third) / 100;
  return [h, s, l].some(Number.isNaN) ? null : hslToRgb(h, s, l);
}

function parseRgbChannel(value: string): number {
  return value.endsWith('%')
    ? (parseFloat(value) / 100) * 255
    : parseFloat(value);
}

// https://www.w3.org/TR/css-color-4/#hsl-to-rgb
function hslToRgb(h: number, s: number, l: number): RGB {
  const hue = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return { r: channel(0), g: channel(8), b: channel(4) };
}
