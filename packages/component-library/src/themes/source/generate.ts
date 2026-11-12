import type { ThemeName, TokenDefinition, TokenValue } from './types';

type Palette = Record<string, string>;
type Colors = Record<string, TokenDefinition>;

function resolveValue(
  name: string,
  value: TokenValue,
  palette: Palette,
  colors: Colors,
) {
  if (typeof value === 'string') {
    if (!(value in palette)) {
      throw new Error(`${name}: unknown palette color "${value}"`);
    }
    return `var(--palette-${value})`;
  }
  if ('ref' in value) {
    if (!(value.ref in colors)) {
      throw new Error(`${name}: unknown token "${value.ref}"`);
    }
    return `var(--color-${value.ref})`;
  }
  return value.raw;
}

function validate(colors: Colors) {
  for (const [name, definition] of Object.entries(colors)) {
    const linked = [definition.fallback, definition.deprecated?.replacedBy];
    for (const target of linked) {
      if (target != null && !(target in colors)) {
        throw new Error(`${name}: unknown token "${target}"`);
      }
    }
  }
}

function toRule(declarations: string[]) {
  return `:root {\n${declarations.join('\n')}\n}\n`;
}

export function generatePaletteCss(palette: Palette) {
  return toRule(
    Object.entries(palette).map(
      ([name, value]) => `  --palette-${name}: ${value};`,
    ),
  );
}

export function generateThemeCss(
  theme: ThemeName,
  colors: Colors,
  palette: Palette,
) {
  validate(colors);
  return toRule(
    Object.entries(colors).map(([name, definition]) => {
      const value = 'all' in definition ? definition.all : definition[theme];
      return `  --color-${name}: ${resolveValue(name, value, palette, colors)};`;
    }),
  );
}

export function toCssVariable(name: string, definition: TokenDefinition) {
  return definition.fallback != null
    ? `var(--color-${name}, var(--color-${definition.fallback}))`
    : `var(--color-${name})`;
}
