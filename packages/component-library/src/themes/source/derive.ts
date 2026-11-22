import {
  clampChroma,
  converter,
  formatHex,
  interpolate,
  parse,
  wcagContrast,
} from './color';

export type AccentSet = {
  accent: string;
  accentContrast: string;
  accentHover: string;
  accentText: string;
  accentBorder: string;
  accentSubtle: string;
  accentSubtleText: string;
};

export type DerivedAccentToken = Exclude<keyof AccentSet, 'accent'>;

export type AccentSurfaces = {
  surface: string;
  page: string;
  mobilePage: string;
};

export const accentSurfaceTokens: Record<keyof AccentSurfaces, string> = {
  surface: 'tableBackground',
  page: 'pageBackground',
  mobilePage: 'mobilePageBackground',
};

export const derivedAccentTokens: DerivedAccentToken[] = [
  'accentContrast',
  'accentHover',
  'accentText',
  'accentBorder',
  'accentSubtle',
  'accentSubtleText',
];

export const textContrast = 4.5;
export const shapeContrast = 3;

const white = '#ffffff';
const black = '#000000';
const hoverStep = 0.06;
const lightnessSteps = 200;
const subtleWeightOnLight = 0.12;
const subtleWeightOnDark = 0.28;

const toOklch = converter('oklch');
const cache = new Map<string, AccentSet>();

function toColor(css: string) {
  const color = toOklch(parse(css));
  if (color == null) {
    throw new Error(`cannot parse color "${css}"`);
  }
  return color;
}

function withLightness(css: string, lightness: number) {
  return formatHex(
    clampChroma(
      { ...toColor(css), l: Math.min(1, Math.max(0, lightness)) },
      'oklch',
      'rgb',
    ),
  );
}

function lowestContrast(css: string, backgrounds: string[]) {
  return Math.min(
    ...backgrounds.map(background => wcagContrast(css, background)),
  );
}

export function nearestWithContrast(
  css: string,
  backgrounds: string[],
  target: number,
) {
  const start = formatHex(toColor(css));
  if (lowestContrast(start, backgrounds) >= target) {
    return start;
  }

  const startLightness = toColor(css).l;
  let nearest: { color: string; distance: number } | null = null;
  let strongest = {
    color: start,
    contrast: lowestContrast(start, backgrounds),
  };
  for (let step = 0; step <= lightnessSteps; step += 1) {
    const lightness = step / lightnessSteps;
    const color = withLightness(css, lightness);
    const contrast = lowestContrast(color, backgrounds);
    const distance = Math.abs(lightness - startLightness);
    if (contrast > strongest.contrast) {
      strongest = { color, contrast };
    }
    if (
      contrast >= target &&
      (nearest == null || distance < nearest.distance)
    ) {
      nearest = { color, distance };
    }
  }
  return nearest?.color ?? strongest.color;
}

function pickContrast(fill: string) {
  if (wcagContrast(white, fill) >= textContrast) {
    return white;
  }
  return wcagContrast(white, fill) >= wcagContrast(black, fill) ? white : black;
}

function hoverFill(fill: string, contrast: string) {
  const lightness = toColor(fill).l;
  const direction = contrast === white ? -1 : 1;
  const away = withLightness(fill, lightness + direction * hoverStep);
  return away === fill
    ? withLightness(fill, lightness - direction * hoverStep)
    : away;
}

export function deriveAccent(
  accent: string,
  { surface, page, mobilePage }: AccentSurfaces,
  ownSubtle?: string,
): AccentSet {
  const key = `${accent}|${surface}|${page}|${mobilePage}|${ownSubtle ?? ''}`;
  const cached = cache.get(key);
  if (cached != null) {
    return cached;
  }

  const fill = formatHex(toColor(accent));
  const contrast = pickContrast(fill);
  const subtleWeight =
    toColor(surface).l > 0.5 ? subtleWeightOnLight : subtleWeightOnDark;
  const subtle = formatHex(
    interpolate([formatHex(toColor(surface)), fill], 'oklab')(subtleWeight),
  );

  const text = nearestWithContrast(
    fill,
    [surface, page, mobilePage, subtle],
    textContrast,
  );

  const accentSet = {
    accent: fill,
    accentContrast: contrast,
    accentHover: hoverFill(fill, contrast),
    accentText: text,
    accentBorder: nearestWithContrast(fill, [surface, page], shapeContrast),
    accentSubtle: ownSubtle ?? subtle,
    accentSubtleText:
      ownSubtle == null
        ? text
        : nearestWithContrast(fill, [ownSubtle], textContrast),
  };
  cache.set(key, accentSet);
  return accentSet;
}
