import { converter, parse } from './source/color';
import { colors } from './source/colors';
import {
  accentSurfaceTokens,
  deriveAccent,
  derivedAccentTokens,
} from './source/derive';
import { palette } from './source/palette';
import { composite, resolveToken, toHex } from './source/resolve';
import type { ResolvedColor } from './source/resolve';
import type { ThemeName } from './source/types';

type Declarations = Map<string, string>;

const inputTokens = ['accent', ...Object.values(accentSurfaceTokens)];
const maxReferenceDepth = 10;
const referencePattern = /^var\s*\(\s*--([a-zA-Z0-9_-]+)\s*\)$/i;
const bareHexPattern = /^[0-9a-f]+$/i;

const toRgb = converter('rgb');
const paletteColors: Record<string, string> = palette;

function readDeclarations(css: string) {
  const declarations: Declarations = new Map();
  for (const match of css.matchAll(/--([A-Za-z0-9_-]+)\s*:\s*([^;}]+)/g)) {
    declarations.set(match[1], match[2].trim());
  }
  return declarations;
}

function parseColor(css: string): ResolvedColor | null {
  if (bareHexPattern.test(css)) {
    return null;
  }
  const color = toRgb(parse(css));
  return color == null
    ? null
    : { r: color.r, g: color.g, b: color.b, alpha: color.alpha ?? 1 };
}

function resolveBuiltIn(property: string, theme: ThemeName) {
  const [kind, name] = property.split(/-(.*)/);
  if (kind === 'color' && Object.hasOwn(colors, name)) {
    return resolveToken(name, theme, colors, palette);
  }
  if (kind === 'palette' && Object.hasOwn(paletteColors, name)) {
    return parseColor(paletteColors[name]);
  }
  return null;
}

function resolveProperty(
  property: string,
  theme: ThemeName,
  declarations: Declarations,
  depth = 0,
): ResolvedColor | null {
  const declared = declarations.get(property);
  if (declared == null) {
    return resolveBuiltIn(property, theme);
  }
  const reference = declared.match(referencePattern);
  if (reference) {
    return depth < maxReferenceDepth
      ? resolveProperty(reference[1], theme, declarations, depth + 1)
      : null;
  }
  return parseColor(declared);
}

function derive(theme: ThemeName, css: string) {
  const declarations = readDeclarations(css);
  if (!inputTokens.some(name => declarations.has(`color-${name}`))) {
    return null;
  }

  const readSurface = (token: string) => {
    const builtIn = resolveToken(token, theme, colors, palette);
    const color = resolveProperty(`color-${token}`, theme, declarations);
    if (color == null) {
      return builtIn;
    }
    return color.alpha < 1 ? composite(color, builtIn) : color;
  };
  const surface = readSurface(accentSurfaceTokens.surface);
  const page = readSurface(accentSurfaceTokens.page);

  const accent = resolveProperty('color-accent', theme, declarations);
  if (accent == null) {
    return null;
  }

  const accentSet = deriveAccent(
    toHex(accent.alpha < 1 ? composite(accent, surface) : accent),
    { surface: toHex(surface), page: toHex(page) },
  );
  const derived = derivedAccentTokens
    .filter(name => !declarations.has(`color-${name}`))
    .map(name => `  --color-${name}: ${accentSet[name]};`);
  return derived.length > 0 ? `:root {\n${derived.join('\n')}\n}` : null;
}

export function deriveAccentCss(theme: ThemeName, css: string) {
  try {
    return derive(theme, css);
  } catch {
    return null;
  }
}
