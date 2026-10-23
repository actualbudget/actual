import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import darkThemeCss from '@actual-app/components/themes/dark.css?inline';
import lightThemeCss from '@actual-app/components/themes/light.css?inline';
import midnightThemeCss from '@actual-app/components/themes/midnight.css?inline';
import paletteCss from '@actual-app/components/themes/palette.css?inline';
import { View } from '@actual-app/components/view';
import type { Theme } from '@actual-app/core/types/prefs';
import { Command } from 'cmdk';

import { useThemeCatalog } from '#hooks/useThemeCatalog';
import { themeOptions } from '#style';
import type { CatalogTheme } from '#style/customThemes';
import {
  extractRepoOwner,
  generateThemeId,
  normalizeGitHubRepo,
} from '#style/customThemes';

import { Highlight, KeyChip } from './primitives';
import { paletteGroupClassName, paletteItemClassName } from './styles';

export const THEME_VALUE_PREFIX = {
  builtin: 'theme-builtin:',
  catalog: 'theme-catalog:',
} as const;

const PALETTE_VALUES = new Map<string, string>();
for (const match of paletteCss.matchAll(/(--palette-[\w-]+):\s*([^;]+);/g)) {
  PALETTE_VALUES.set(match[1], match[2].trim());
}

/** Resolve a `--color-*` token from raw theme CSS to a concrete color. */
function resolveThemeColor(themeCss: string, token: string): string | null {
  const match = themeCss.match(new RegExp(`--color-${token}:\\s*([^;]+);`));
  if (!match) return null;
  const value = match[1].trim();
  const varRef = value.match(/^var\((--palette-[\w-]+)\)$/);
  return varRef ? (PALETTE_VALUES.get(varRef[1]) ?? null) : value;
}

// mirrors the 6-color previews that community themes ship in the catalog
const SWATCH_TOKENS = [
  'pageBackground',
  'tableBackground',
  'pageText',
  'buttonPrimaryBackground',
  'noticeText',
  'errorText',
];

function themeSwatches(themeCss: string): string[] {
  return SWATCH_TOKENS.map(token => resolveThemeColor(themeCss, token)).filter(
    (color): color is string => color !== null,
  );
}

type BuiltinThemeRow = {
  key: Theme;
  name: string;
  mode: 'light' | 'dark' | 'auto';
  swatches: string[];
};

const builtinThemeNames = new Map<string, string>(themeOptions);
const BUILTIN_THEME_ROWS: BuiltinThemeRow[] = (
  [
    { key: 'light', mode: 'light', themeCss: lightThemeCss },
    { key: 'dark', mode: 'dark', themeCss: darkThemeCss },
    { key: 'midnight', mode: 'dark', themeCss: midnightThemeCss },
    { key: 'auto', mode: 'auto', themeCss: darkThemeCss },
  ] as const
).map(({ key, mode, themeCss }) => ({
  key,
  name: builtinThemeNames.get(key) ?? key,
  mode,
  swatches: themeSwatches(themeCss),
}));

function catalogThemeId(repo: string): string | null {
  try {
    return generateThemeId(normalizeGitHubRepo(repo));
  } catch {
    return null;
  }
}

const SWATCH_SIZE = 16;
const SWATCH_OVERLAP = 7; // px each circle tucks under the previous one

function ThemeSwatches({ colors }: { colors: string[] }) {
  return (
    <View
      aria-hidden
      style={{
        position: 'relative',
        flexShrink: 0,
        // reserve room for the full stack: first circle plus each
        // subsequent one's visible sliver
        width:
          SWATCH_SIZE + (colors.length - 1) * (SWATCH_SIZE - SWATCH_OVERLAP),
        height: SWATCH_SIZE,
      }}
    >
      {colors.map((color, idx) => (
        <View
          key={idx}
          style={{
            position: 'absolute',
            left: idx * (SWATCH_SIZE - SWATCH_OVERLAP),
            width: SWATCH_SIZE,
            height: SWATCH_SIZE,
            borderRadius: '50%',
            backgroundColor: color,
            border: '1.5px solid var(--color-modalBackground)',
            // later circles sit on top of earlier ones
            zIndex: idx,
          }}
        />
      ))}
    </View>
  );
}

function ModeBadge({ mode }: { mode: 'light' | 'dark' | 'auto' }) {
  const { t } = useTranslation();
  const label =
    mode === 'light' ? t('Light') : mode === 'dark' ? t('Dark') : t('Auto');
  return <KeyChip>{label}</KeyChip>;
}

function CurrentBadge() {
  return (
    <Text
      style={{
        flexShrink: 0,
        fontSize: 11.5,
        color: 'var(--color-pageTextPositive)',
      }}
    >
      <Trans>Current</Trans>
    </Text>
  );
}

const themeItemLabelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export function ThemePage({
  search,
  activeBuiltinTheme,
  activeCustomThemeId,
  onSelectBuiltin,
  onSelectCatalog,
}: {
  search: string;
  activeBuiltinTheme: Theme;
  activeCustomThemeId: string | null;
  onSelectBuiltin: (theme: Theme) => void;
  onSelectCatalog: (theme: CatalogTheme) => void;
}) {
  const { t } = useTranslation();
  // Mounted only while the theme page is open, so the catalog is fetched
  // lazily instead of on app start.
  const { data: catalog, isLoading, error } = useThemeCatalog();

  const query = search.trim().toLowerCase();
  const matchingBuiltins = BUILTIN_THEME_ROWS.map(row => ({
    ...row,
    label: t(row.name),
  })).filter(row => row.label.toLowerCase().includes(query));
  const matchingCatalog = (catalog ?? []).filter(
    item =>
      item.name.toLowerCase().includes(query) ||
      extractRepoOwner(item.repo).toLowerCase().includes(query),
  );

  return (
    <>
      {matchingBuiltins.length > 0 && (
        <Command.Group
          heading={t('Built-in themes')}
          className={paletteGroupClassName}
        >
          {matchingBuiltins.map(row => (
            <Command.Item
              key={row.key}
              value={`${THEME_VALUE_PREFIX.builtin}${row.key}`}
              onSelect={() => onSelectBuiltin(row.key)}
              className={paletteItemClassName}
            >
              <ThemeSwatches colors={row.swatches} />
              <Text style={themeItemLabelStyle}>
                <Highlight text={row.label} query={search} />
              </Text>
              {activeCustomThemeId == null &&
                activeBuiltinTheme === row.key && <CurrentBadge />}
              <ModeBadge mode={row.mode} />
            </Command.Item>
          ))}
        </Command.Group>
      )}
      <Command.Group
        heading={t('Community themes')}
        className={paletteGroupClassName}
      >
        {isLoading && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              color: 'var(--color-pageTextSubdued)',
            }}
          >
            <AnimatedLoading style={{ width: 14, height: 14 }} />
            <Text style={{ fontSize: 13 }}>
              <Trans>Loading community themes…</Trans>
            </Text>
          </View>
        )}
        {error != null && !isLoading && (
          <Text
            style={{
              display: 'block',
              padding: '7px 10px',
              fontSize: 13,
              color: 'var(--color-pageTextSubdued)',
            }}
          >
            <Trans>Could not load the community theme catalog.</Trans>
          </Text>
        )}
        {matchingCatalog.map(item => (
          <Command.Item
            key={item.repo}
            value={`${THEME_VALUE_PREFIX.catalog}${item.repo}`}
            onSelect={() => onSelectCatalog(item)}
            className={paletteItemClassName}
          >
            <ThemeSwatches colors={item.colors ?? []} />
            <Text style={themeItemLabelStyle}>
              <Highlight text={item.name} query={search} />
            </Text>
            <Text
              style={{
                flexShrink: 0,
                fontSize: 11.5,
                color: 'var(--color-pageTextSubdued)',
              }}
            >
              {t('by {{creator}}', { creator: extractRepoOwner(item.repo) })}
            </Text>
            {activeCustomThemeId != null &&
              activeCustomThemeId === catalogThemeId(item.repo) && (
                <CurrentBadge />
              )}
            <ModeBadge mode={item.mode} />
          </Command.Item>
        ))}
      </Command.Group>
    </>
  );
}
