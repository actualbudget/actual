import { formatHex, formatHex8 } from './color';
import { colors } from './colors';
import { palette } from './palette';
import { resolveToken } from './resolve';
import { themeNames } from './types';
import type { ThemeName, TokenDefinition, TokenValue } from './types';

const definitions: Record<string, TokenDefinition> = colors;

function valueIn(name: string, theme: ThemeName) {
  const color = resolveToken(name, theme, colors, palette);
  const rgb = { mode: 'rgb' as const, ...color };
  return `\`${color.alpha < 1 ? formatHex8(rgb) : formatHex(rgb)}\``;
}

const themeLabels: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  midnight: 'Midnight',
};

function source(value: TokenValue) {
  if (typeof value !== 'object') {
    return null;
  }
  if ('ref' in value) {
    return `\`--color-${value.ref}\``;
  }
  if ('derive' in value) {
    return '`--color-accent`';
  }
  if ('accentTextOn' in value) {
    return `\`--color-accent\`, readable on \`--color-${value.accentTextOn}\``;
  }
  if ('contrastOn' in value) {
    const over = value.over == null ? '' : ` over \`--color-${value.over}\``;
    return `Black or white on \`--color-${value.contrastOn}\`${over}`;
  }
  if ('statusOf' in value) {
    const input = `\`--color-${value.statusOf}\``;
    return value.part === 'fill' || value.part === 'fillSubtle'
      ? `${input}, as a fill`
      : `${input}, readable as text`;
  }
  if ('raw' in value) {
    const mixed = [...value.raw.matchAll(/var\(--color-([A-Za-z0-9]+)\)/g)].map(
      match => `\`--color-${match[1]}\``,
    );
    return mixed.length > 0 ? `Mixed from ${mixed.join(' and ')}` : null;
  }
  return null;
}

function followed(name: string) {
  const definition = definitions[name];
  if ('all' in definition) {
    return source(definition.all) ?? '';
  }
  const sources = themeNames.map(theme => source(definition[theme]));
  const first = sources[0];
  if (first != null && sources.every(value => value === first)) {
    return first;
  }
  const grouped = new Map<string, string[]>();
  themeNames.forEach((theme, index) => {
    const value = sources[index];
    if (value != null) {
      grouped.set(value, [...(grouped.get(value) ?? []), themeLabels[theme]]);
    }
  });
  return [...grouped]
    .map(([value, themes]) => `${value} in ${themes.join(' and ')}`)
    .join(', ');
}

function row(cells: string[]) {
  return `| ${cells.join(' | ')} |`;
}

function table(header: string[], rows: string[][]) {
  const widths = header.map((title, column) =>
    Math.max(title.length, 3, ...rows.map(cells => cells[column].length)),
  );
  const pad = (cells: string[]) =>
    row(cells.map((cell, column) => cell.padEnd(widths[column])));
  return [
    pad(header),
    row(widths.map(width => '-'.repeat(width))),
    ...rows.map(pad),
  ].join('\n');
}

export function buildThemeReference() {
  const names = Object.keys(definitions);
  const described = names.filter(name => definitions[name].description != null);
  const others = names.filter(name => definitions[name].description == null);
  const values = (name: string) =>
    themeNames.map(theme => valueIn(name, theme));

  return `# Theme Variable Reference

This page lists every CSS variable a [custom theme](./custom-themes.md) can set, with the color each one has in the built-in **Light**, **Dark** and **Midnight** themes.

## Accent and Base Colors

Start with these. Many of the variables further down follow them, so a theme can set a few of these and leave the rest alone.

${table(
  ['Variable', 'Used For', 'Light', 'Dark', 'Midnight'],
  described.map(name => [
    `\`--color-${name}\``,
    definitions[name].description ?? '',
    ...values(name),
  ]),
)}

## All Other Variables

The **Follows** column names the variable a color is taken from, or worked out from, when a theme does not set it. Setting the variable in that column changes both.

${table(
  ['Variable', 'Light', 'Dark', 'Midnight', 'Follows'],
  others.map(name => [`\`--color-${name}\``, ...values(name), followed(name)]),
)}

_This page is generated from the theme source in \`packages/component-library/src/themes/source/colors.ts\`._
`;
}
