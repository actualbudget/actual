import {
  clampChroma,
  converter,
  formatHex,
  interpolate,
  parse,
  wcagContrast,
  wcagLuminance,
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

export type StatusSet = {
  fill: string;
  fillSubtle: string;
  text: string;
  textOnSubtle: string;
  textStrong: string;
};

export type StatusPart = keyof StatusSet;

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
export const strongTextContrast = 6;
export const shapeContrast = 3;

const white = '#ffffff';
const black = '#000000';
const hoverStep = 0.06;
const lightnessSteps = 200;
const subtleWeightOnLight = 0.12;
const subtleWeightOnDark = 0.28;

const statusFillLightness = { light: 0.94, dark: 0.46 };
const statusFillSubtleLightness = { light: 0.97, dark: 0.37 };

const toOklch = converter('oklch');
const cache = new Map<string, AccentSet>();
const statusCache = new Map<string, StatusSet>();

function toColor(css: string) {
  const color = toOklch(parse(css));
  if (color == null) {
    throw new Error(`cannot parse color "${css}"`);
  }
  return color;
}

function atLightness(color: ReturnType<typeof toColor>, lightness: number) {
  return formatHex(
    clampChroma(
      { ...color, l: Math.min(1, Math.max(0, lightness)) },
      'oklch',
      'rgb',
    ),
  );
}

function withLightness(css: string, lightness: number) {
  return atLightness(toColor(css), lightness);
}

type ContrastGoal = { backgrounds: string[]; target: number };
type LightnessStep = { color: string; luminance: number };

const stepCache = new Map<string, Array<LightnessStep | undefined>>();

function stepsOf(start: string, base: ReturnType<typeof toColor>) {
  let steps = stepCache.get(start);
  if (steps == null) {
    steps = [];
    stepCache.set(start, steps);
  }
  const cached = steps;
  return (index: number) => {
    let step = cached[index];
    if (step == null) {
      const color = atLightness(base, index / lightnessSteps);
      step = { color, luminance: wcagLuminance(color) };
      cached[index] = step;
    }
    return step;
  };
}

export function nearestWithContrasts(css: string, goals: ContrastGoal[]) {
  const base = toColor(css);
  const start = formatHex(base);
  const searches = goals.map(goal => ({
    target: goal.target,
    luminances: goal.backgrounds.map(background => wcagLuminance(background)),
    found: null as string | null,
    strongest: { color: start, contrast: 0 },
  }));

  const measure = ({ color, luminance: own }: LightnessStep) => {
    let open = 0;
    for (const search of searches) {
      if (search.found != null) {
        continue;
      }
      let lowest = Infinity;
      for (const luminance of search.luminances) {
        const contrast =
          (Math.max(own, luminance) + 0.05) / (Math.min(own, luminance) + 0.05);
        if (contrast < lowest) {
          lowest = contrast;
        }
      }
      if (lowest >= search.target) {
        search.found = color;
      } else {
        open += 1;
        if (lowest > search.strongest.contrast) {
          search.strongest = { color, contrast: lowest };
        }
      }
    }
    return open;
  };

  if (measure({ color: start, luminance: wcagLuminance(start) }) > 0) {
    const stepAt = stepsOf(start, base);
    const nearestFirst = Array.from(
      { length: lightnessSteps + 1 },
      (_, index) => index,
    ).sort(
      (a, b) =>
        Math.abs(a / lightnessSteps - base.l) -
        Math.abs(b / lightnessSteps - base.l),
    );
    for (const index of nearestFirst) {
      if (measure(stepAt(index)) === 0) {
        break;
      }
    }
  }
  return searches.map(search => search.found ?? search.strongest.color);
}

export function nearestWithContrast(
  css: string,
  backgrounds: string[],
  target: number,
) {
  return nearestWithContrasts(css, [{ backgrounds, target }])[0];
}

export function pickContrast(fill: string) {
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
): AccentSet {
  const key = `${accent}|${surface}|${page}|${mobilePage}`;
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
    accentSubtle: subtle,
    accentSubtleText: text,
  };
  cache.set(key, accentSet);
  return accentSet;
}

export function deriveStatus(
  status: string,
  { surface, page, mobilePage }: AccentSurfaces,
): StatusSet {
  const key = `${status}|${surface}|${page}|${mobilePage}`;
  const cached = statusCache.get(key);
  if (cached != null) {
    return cached;
  }

  const input = toColor(status);
  const tone = toColor(surface).l > 0.5 ? 'light' : 'dark';
  const fill = atLightness(input, statusFillLightness[tone]);
  const fillSubtle = atLightness(input, statusFillSubtleLightness[tone]);
  const surfaces = [surface, page, mobilePage];
  const [text, textOnSubtle, textStrong] = nearestWithContrasts(status, [
    { backgrounds: [...surfaces, fill], target: textContrast },
    { backgrounds: [...surfaces, fillSubtle], target: textContrast },
    { backgrounds: [...surfaces, fill], target: strongTextContrast },
  ]);

  const statusSet = { fill, fillSubtle, text, textOnSubtle, textStrong };
  statusCache.set(key, statusSet);
  return statusSet;
}
