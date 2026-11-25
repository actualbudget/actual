import { converter, parse } from './source/color';
import { colors } from './source/colors';
import {
  accentSurfaceTokens,
  deriveAccent,
  derivedAccentTokens,
  nearestWithContrast,
  pickContrast,
  textContrast,
} from './source/derive';
import { palette } from './source/palette';
import { composite, resolveToken, toHex } from './source/resolve';
import type { ResolvedColor } from './source/resolve';
import type { ThemeName, TokenDefinition } from './source/types';

type Declarations = Map<string, string>;

const inputTokens = ['accent', ...Object.values(accentSurfaceTokens)];
const maxReferenceDepth = 10;
const referencePattern = /^var\s*\(\s*--([a-zA-Z0-9_-]+)\s*\)$/i;
const bareHexPattern = /^[0-9a-f]+$/i;
const customPropertyPattern = /^--[A-Za-z0-9_-]+$/;

const toRgb = converter('rgb');
const paletteColors: Record<string, string> = palette;
const definitions: Record<string, TokenDefinition> = colors;

function accentTextOnTokens(theme: ThemeName) {
  return Object.entries(definitions).flatMap(([name, definition]) => {
    const value = 'all' in definition ? definition.all : definition[theme];
    return typeof value === 'object' && 'accentTextOn' in value
      ? [
          {
            name,
            surface: value.accentTextOn,
            contrast: value.contrast ?? textContrast,
          },
        ]
      : [];
  });
}

function contrastOnTokens(theme: ThemeName) {
  return Object.entries(definitions).flatMap(([name, definition]) => {
    const value = 'all' in definition ? definition.all : definition[theme];
    return typeof value === 'object' && 'contrastOn' in value
      ? [{ name, fill: value.contrastOn, over: value.over }]
      : [];
  });
}

function readDeclarations(css: string) {
  const declarations: Declarations = new Map();
  for (const declaration of css.split(/[;{}]/)) {
    const separator = declaration.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const name = declaration.slice(0, separator).trim().split(/\s/).at(-1);
    const value = declaration.slice(separator + 1).trim();
    if (name != null && customPropertyPattern.test(name) && value !== '') {
      declarations.set(name.slice(2), value);
    }
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
  const textOnTokens = accentTextOnTokens(theme);
  const contrastTokens = contrastOnTokens(theme);
  const inputs = [
    ...inputTokens,
    ...textOnTokens.map(token => token.surface),
    ...contrastTokens.map(token => token.fill),
  ];
  if (!inputs.some(name => declarations.has(`color-${name}`))) {
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
  const mobilePage = readSurface(accentSurfaceTokens.mobilePage);

  const accent = resolveProperty('color-accent', theme, declarations);
  if (accent == null) {
    return null;
  }

  const accentSet = deriveAccent(
    toHex(accent.alpha < 1 ? composite(accent, surface) : accent),
    {
      surface: toHex(surface),
      page: toHex(page),
      mobilePage: toHex(mobilePage),
    },
  );
  const themed: Record<string, TokenDefinition> = {
    ...definitions,
    accent: { all: { raw: accentSet.accent } },
  };
  const readFill = (token: string, over?: string) => {
    const declared = declarations.has(`color-${token}`)
      ? resolveProperty(`color-${token}`, theme, declarations)
      : null;
    const fill = declared ?? resolveToken(token, theme, themed, palette);
    const backdrop =
      over == null
        ? resolveToken(token, theme, colors, palette)
        : readSurface(over);
    return composite(fill, backdrop);
  };
  const derived = [
    ...derivedAccentTokens.map(name => ({ name, value: accentSet[name] })),
    ...textOnTokens.map(token => ({
      name: token.name,
      value: nearestWithContrast(
        accentSet.accent,
        [toHex(readSurface(token.surface))],
        token.contrast,
      ),
    })),
    ...contrastTokens.map(token => ({
      name: token.name,
      value: pickContrast(toHex(readFill(token.fill, token.over))),
    })),
  ]
    .filter(({ name }) => !declarations.has(`color-${name}`))
    .map(({ name, value }) => `  --color-${name}: ${value};`);
  return derived.length > 0 ? `:root {\n${derived.join('\n')}\n}` : null;
}

export function deriveAccentCss(theme: ThemeName, css: string) {
  try {
    return derive(theme, css);
  } catch {
    return null;
  }
}
