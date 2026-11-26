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

function createResolver(
  theme: ThemeName,
  declarations: Declarations,
  generated: Record<string, string> = {},
) {
  const resolving = new Set<string>();

  function resolveBuiltIn(property: string) {
    const [kind, name] = property.split(/-(.*)/);
    if (kind === 'color' && Object.hasOwn(colors, name)) {
      return resolveToken(name, theme, colors, palette, other => {
        if (declarations.has(`color-${other}`)) {
          return resolveProperty(`color-${other}`);
        }
        return Object.hasOwn(generated, other)
          ? parseColor(generated[other])
          : undefined;
      });
    }
    if (kind === 'palette' && Object.hasOwn(paletteColors, name)) {
      return parseColor(paletteColors[name]);
    }
    return null;
  }

  function resolveProperty(property: string): ResolvedColor | null {
    if (resolving.has(property)) {
      return null;
    }
    resolving.add(property);
    try {
      const declared = declarations.get(property);
      if (declared == null) {
        return resolveBuiltIn(property);
      }
      const reference = declared.match(referencePattern);
      return reference ? resolveProperty(reference[1]) : parseColor(declared);
    } finally {
      resolving.delete(property);
    }
  }

  return resolveProperty;
}

function derive(theme: ThemeName, css: string) {
  const declarations = readDeclarations(css);
  if (![...declarations.keys()].some(name => name.startsWith('color-'))) {
    return null;
  }

  const resolve = createResolver(theme, declarations);
  const textOnTokens = accentTextOnTokens(theme);
  const contrastTokens = contrastOnTokens(theme);
  const builtIn = (token: string) =>
    resolveToken(token, theme, colors, palette);
  const surfaceReader =
    (lookup: ReturnType<typeof createResolver>) => (token: string) => {
      const color = lookup(`color-${token}`) ?? builtIn(token);
      return color.alpha < 1 ? composite(color, builtIn(token)) : color;
    };
  const readSurface = surfaceReader(resolve);
  const surface = readSurface(accentSurfaceTokens.surface);
  const page = readSurface(accentSurfaceTokens.page);
  const mobilePage = readSurface(accentSurfaceTokens.mobilePage);

  const accent = resolve('color-accent');
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
  const resolveWithSet = createResolver(
    theme,
    declarations,
    Object.fromEntries(
      derivedAccentTokens.map(name => [name, accentSet[name]]),
    ),
  );
  const readSetSurface = surfaceReader(resolveWithSet);
  const readFill = (token: string, over?: string) => {
    const fill = resolveWithSet(`color-${token}`) ?? builtIn(token);
    return composite(
      fill,
      over == null ? builtIn(token) : readSetSurface(over),
    );
  };
  const derived = [
    ...derivedAccentTokens.map(name => ({ name, value: accentSet[name] })),
    ...textOnTokens.map(token => ({
      name: token.name,
      value: nearestWithContrast(
        accentSet.accent,
        [toHex(readSetSurface(token.surface))],
        token.contrast,
      ),
    })),
    ...contrastTokens.map(token => ({
      name: token.name,
      value: pickContrast(toHex(readFill(token.fill, token.over))),
    })),
  ]
    .filter(({ name }) => !declarations.has(`color-${name}`))
    .filter(({ name, value }) => value !== toHex(builtIn(name)))
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
