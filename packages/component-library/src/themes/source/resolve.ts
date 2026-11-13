import { converter, parse, wcagContrast } from 'culori';

import type { ThemeName, TokenDefinition, TokenValue } from './types';

type Palette = Record<string, string>;
type Colors = Record<string, TokenDefinition>;

export type ResolvedColor = { r: number; g: number; b: number; alpha: number };

type Context = {
  theme: ThemeName;
  colors: Colors;
  palette: Palette;
  path: string[];
};

const toRgb = converter('rgb');

function splitArguments(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of input) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  parts.push(current.trim());
  return parts;
}

function parseMixComponent(input: string) {
  const match = input.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
  if (!match) {
    throw new Error(`cannot parse color-mix component "${input}"`);
  }
  return {
    color: match[1].trim(),
    percentage: match[2] == null ? null : Number(match[2]),
  };
}

function resolveColorMix(input: string, context: Context): ResolvedColor {
  const [space, first, second] = splitArguments(input);
  if (space !== 'in srgb' || first == null || second == null) {
    throw new Error(`unsupported color-mix "${input}"`);
  }

  const a = parseMixComponent(first);
  const b = parseMixComponent(second);
  let weightA =
    a.percentage ?? (b.percentage == null ? 50 : 100 - b.percentage);
  let weightB = b.percentage ?? 100 - weightA;
  const total = weightA + weightB;
  if (total <= 0) {
    throw new Error(`color-mix percentages add up to zero in "${input}"`);
  }
  const alphaMultiplier = Math.min(total, 100) / 100;
  weightA /= total;
  weightB /= total;

  const colorA = resolveCss(a.color, context);
  const colorB = resolveCss(b.color, context);
  const alpha = colorA.alpha * weightA + colorB.alpha * weightB;
  const mixChannel = (channel: 'r' | 'g' | 'b') =>
    alpha === 0
      ? 0
      : (colorA[channel] * colorA.alpha * weightA +
          colorB[channel] * colorB.alpha * weightB) /
        alpha;

  return {
    r: mixChannel('r'),
    g: mixChannel('g'),
    b: mixChannel('b'),
    alpha: alpha * alphaMultiplier,
  };
}

function resolveCss(input: string, context: Context): ResolvedColor {
  const css = input.trim();

  const variable = css.match(/^var\(--(color|palette)-([A-Za-z0-9]+)\)$/);
  if (variable) {
    const [, kind, name] = variable;
    if (kind === 'color') {
      return resolveName(name, context);
    }
    if (!(name in context.palette)) {
      throw new Error(`unknown palette color "${name}"`);
    }
    return resolveCss(context.palette[name], context);
  }

  const mix = css.match(/^color-mix\((.*)\)$/);
  if (mix) {
    return resolveColorMix(mix[1], context);
  }

  const parsed = toRgb(parse(css));
  if (parsed == null) {
    throw new Error(`cannot parse color "${css}"`);
  }
  return { r: parsed.r, g: parsed.g, b: parsed.b, alpha: parsed.alpha ?? 1 };
}

function resolveValue(value: TokenValue, context: Context): ResolvedColor {
  if (typeof value === 'string') {
    return resolveCss(context.palette[value], context);
  }
  if ('ref' in value) {
    return resolveName(value.ref, context);
  }
  return resolveCss(value.raw, context);
}

function resolveName(name: string, context: Context): ResolvedColor {
  if (!(name in context.colors)) {
    throw new Error(`unknown token "${name}"`);
  }
  if (context.path.includes(name)) {
    throw new Error(
      `circular reference: ${[...context.path, name].join(' -> ')}`,
    );
  }
  const definition = context.colors[name];
  const value =
    'all' in definition ? definition.all : definition[context.theme];
  return resolveValue(value, { ...context, path: [...context.path, name] });
}

export function resolveToken(
  name: string,
  theme: ThemeName,
  colors: Colors,
  palette: Palette,
) {
  return resolveName(name, { theme, colors, palette, path: [] });
}

export function composite(
  top: ResolvedColor,
  bottom: ResolvedColor,
): ResolvedColor {
  const alpha = top.alpha + bottom.alpha * (1 - top.alpha);
  const channel = (key: 'r' | 'g' | 'b') =>
    alpha === 0
      ? 0
      : (top[key] * top.alpha + bottom[key] * bottom.alpha * (1 - top.alpha)) /
        alpha;
  return { r: channel('r'), g: channel('g'), b: channel('b'), alpha };
}

export function contrastRatio(text: ResolvedColor, background: ResolvedColor) {
  if (background.alpha < 1) {
    throw new Error('the background must be opaque to measure contrast');
  }
  const visibleText = composite(text, background);
  return wcagContrast(
    { mode: 'rgb', ...visibleText },
    { mode: 'rgb', ...background },
  );
}
