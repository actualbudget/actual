import React, { useCallback, useEffect, useState } from 'react';
import { TextArea } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { baseInputStyle } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ColorPalette } from './ColorPalette';

import { Link } from '@desktop-client/components/common/Link';
import { FixedSizeList } from '@desktop-client/components/FixedSizeList';
import { useThemeCatalog } from '@desktop-client/hooks/useThemeCatalog';
import {
  extractRepoOwner,
  fetchThemeCss,
  generateThemeId,
  normalizeGitHubRepo,
  validateThemeCss,
  type CatalogTheme,
  type InstalledTheme,
} from '@desktop-client/style/customThemes';

// Theme item fixed dimensions
const THEME_ITEM_HEIGHT = 140;
const THEME_ITEM_WIDTH = 140;
const THEME_ITEM_GAP = 12;
const CATALOG_MAX_HEIGHT = 300;

type ThemeInstallerProps = {
  onInstall: (theme: InstalledTheme) => void;
  onClose: () => void;
  installedTheme?: InstalledTheme | null;
};

export function ThemeInstaller({
  onInstall,
  onClose,
  installedTheme,
}: ThemeInstallerProps) {
  const { t } = useTranslation();
  const [selectedCatalogTheme, setSelectedCatalogTheme] =
    useState<CatalogTheme | null>(null);
  const [erroringTheme, setErroringTheme] = useState<CatalogTheme | null>(null);
  const [pastedCss, setPastedCss] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalog from GitHub using custom hook
  const {
    data: catalog,
    isLoading: catalogLoading,
    error: catalogError,
  } = useThemeCatalog();

  // Initialize pastedCss with installed custom theme CSS if it exists
  useEffect(() => {
    // If there's an installed theme with empty repo (custom pasted CSS), restore it
    if (installedTheme && !installedTheme.repo) {
      setPastedCss(installedTheme.cssContent);
    }
  }, [installedTheme]);

  // Calculate items per row based on container width
  const getItemsPerRow = useCallback((containerWidth: number) => {
    const padding = 8; // 4px on each side
    const availableWidth = containerWidth - padding;
    return Math.max(
      1,
      Math.floor(
        (availableWidth + THEME_ITEM_GAP) / (THEME_ITEM_WIDTH + THEME_ITEM_GAP),
      ),
    );
  }, []);

  // Helper function to check if a catalog theme matches an installed theme
  const isCatalogThemeInstalled = useCallback(
    (catalogTheme: CatalogTheme): boolean => {
      if (!installedTheme) return false;
      try {
        const normalizedRepo = normalizeGitHubRepo(catalogTheme.repo);
        const themeId = generateThemeId(normalizedRepo);
        return themeId === installedTheme.id;
      } catch {
        return false;
      }
    },
    [installedTheme],
  );

  const installTheme = useCallback(
    async (options: {
      css: string | Promise<string>;
      name: string;
      repo: string;
      id: string;
      errorMessage: string;
      catalogTheme?: CatalogTheme | null;
    }) => {
      setError(null);
      setErroringTheme(null);
      setIsLoading(true);

      try {
        const css =
          typeof options.css === 'string' ? options.css : await options.css;
        const validatedCss = validateThemeCss(css);

        const installedTheme: InstalledTheme = {
          id: options.id,
          name: options.name,
          repo: options.repo,
          cssContent: validatedCss,
        };
        onInstall(installedTheme);
        // Only set selectedCatalogTheme on success if it's a catalog theme
        if (options.catalogTheme) {
          setSelectedCatalogTheme(options.catalogTheme);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : options.errorMessage);
        // Track which theme failed and clear selection
        if (options.catalogTheme) {
          setErroringTheme(options.catalogTheme);
        }
        setSelectedCatalogTheme(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onInstall],
  );

  const handleCatalogThemeClick = useCallback(
    async (theme: CatalogTheme) => {
      setPastedCss('');
      setSelectedCatalogTheme(theme);

      const normalizedRepo = normalizeGitHubRepo(theme.repo);
      await installTheme({
        css: fetchThemeCss(theme.repo),
        name: theme.name,
        repo: normalizedRepo,
        id: generateThemeId(normalizedRepo),
        errorMessage: t('Failed to load theme'),
        catalogTheme: theme,
      });
    },
    [installTheme, t],
  );

  const handlePastedCssChange = useCallback((value: string) => {
    setPastedCss(value);
    setSelectedCatalogTheme(null);
    setErroringTheme(null);
    setError(null);
  }, []);

  const handleInstallPastedCss = useCallback(() => {
    if (!pastedCss.trim()) return;

    installTheme({
      css: pastedCss.trim(),
      name: t('Custom Theme'),
      repo: '',
      id: generateThemeId(`pasted-${Date.now()}`),
      errorMessage: t('Failed to validate theme CSS'),
    });
  }, [pastedCss, installTheme, t]);

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: themeStyle.tableBackground,
        borderRadius: 8,
        border: `1px solid ${themeStyle.tableBorder}`,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontWeight: 600, fontSize: 14 }}>
          <Trans>Install Custom Theme</Trans>
        </Text>
        <Button variant="bare" onPress={onClose}>
          <Trans>Close</Trans>
        </Button>
      </View>

      {/* Catalog Virtualized List */}
      <Text style={{ marginBottom: 8, color: themeStyle.pageTextSubdued }}>
        <Trans>Choose from catalog:</Trans>
      </Text>
      {catalogError ? (
        <Text
          style={{
            color: themeStyle.errorText,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          <Trans>
            Failed to load theme catalog. You can still paste custom CSS below.
          </Trans>
        </Text>
      ) : (
        <View
          style={{
            height: CATALOG_MAX_HEIGHT,
            marginBottom: 16,
          }}
        >
          {catalogLoading ? (
            <View
              style={{
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading
                style={{
                  width: 24,
                  height: 24,
                  color: themeStyle.pageText,
                }}
              />
            </View>
          ) : (
            <AutoSizer
              renderProp={({ width = 0, height = 0 }) => {
                if (width === 0 || height === 0) {
                  return null;
                }

                const catalogItems = catalog ?? [];
                const itemsPerRow = getItemsPerRow(width);
                const rows: CatalogTheme[][] = [];
                for (let i = 0; i < catalogItems.length; i += itemsPerRow) {
                  rows.push(catalogItems.slice(i, i + itemsPerRow));
                }

                return (
                  <FixedSizeList
                    width={width}
                    height={height}
                    itemCount={rows.length}
                    itemSize={THEME_ITEM_HEIGHT + THEME_ITEM_GAP}
                    itemKey={index => `row-${index}`}
                    renderRow={({ index, style }) => {
                      const rowThemes = rows[index];
                      return (
                        <div
                          style={{
                            ...style,
                            display: 'flex',
                            gap: THEME_ITEM_GAP,
                            padding: '0 4px',
                          }}
                        >
                          {rowThemes.map((theme, themeIndex) => {
                            const isActive = isCatalogThemeInstalled(theme);
                            const hasError =
                              erroringTheme?.name === theme.name &&
                              erroringTheme?.repo === theme.repo;
                            const isSelected =
                              selectedCatalogTheme?.name === theme.name &&
                              selectedCatalogTheme?.repo === theme.repo;

                            const isLoadingSelected = isLoading && isSelected;

                            return (
                              <Button
                                key={`${theme.name}-${index}-${themeIndex}`}
                                variant="bare"
                                aria-label={theme.name}
                                onPress={() => handleCatalogThemeClick(theme)}
                                style={{
                                  width: THEME_ITEM_WIDTH,
                                  height: THEME_ITEM_HEIGHT,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: `2px solid ${
                                    hasError
                                      ? themeStyle.errorText
                                      : isActive
                                        ? themeStyle.buttonPrimaryBackground
                                        : themeStyle.tableBorder
                                  }`,
                                  backgroundColor: hasError
                                    ? themeStyle.errorBackground
                                    : isActive
                                      ? themeStyle.tableRowBackgroundHover
                                      : 'transparent',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 8,
                                  flexShrink: 0,
                                  position: 'relative',
                                }}
                              >
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    borderRadius: 6,
                                    backgroundColor:
                                      themeStyle.overlayBackground,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1,
                                    opacity: isLoadingSelected ? 1 : 0,
                                    pointerEvents: isLoadingSelected
                                      ? 'auto'
                                      : 'none',
                                    transition: 'opacity 0.2s ease-in-out',
                                  }}
                                >
                                  <AnimatedLoading
                                    style={{
                                      width: 24,
                                      height: 24,
                                      color: themeStyle.pageText,
                                    }}
                                  />
                                </View>
                                <ColorPalette colors={theme.colors} />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    textAlign: 'center',
                                  }}
                                >
                                  {theme.name}
                                </Text>

                                <SpaceBetween
                                  direction="horizontal"
                                  align="center"
                                  gap={4}
                                  style={{ fontSize: 10 }}
                                >
                                  <Text
                                    style={{
                                      color: themeStyle.pageTextSubdued,
                                    }}
                                  >
                                    {t('by')}{' '}
                                    <Text style={{ fontWeight: 'bold' }}>
                                      {extractRepoOwner(theme.repo)}
                                    </Text>
                                  </Text>
                                  <Link
                                    variant="external"
                                    to={normalizeGitHubRepo(theme.repo)}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Trans>Source</Trans>
                                  </Link>
                                </SpaceBetween>
                              </Button>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                );
              }}
            />
          )}
        </View>
      )}

      {/* Paste CSS Input */}
      <View
        style={{
          borderTop: `1px solid ${themeStyle.tableBorder}`,
          paddingTop: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ marginBottom: 8, color: themeStyle.pageTextSubdued }}>
          <Trans>or paste CSS directly:</Trans>
        </Text>
        <TextArea
          value={pastedCss}
          onChange={e => handlePastedCssChange(e.target.value)}
          placeholder={t(':root {\n  --color-sidebarItemSelected: #007bff;\n}')}
          aria-label={t('Custom Theme CSS')}
          style={{
            ...baseInputStyle,
            height: 120,
            resize: 'vertical',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 8,
          }}
        >
          <Button
            variant="normal"
            onPress={handleInstallPastedCss}
            isDisabled={!pastedCss.trim() || isLoading}
          >
            <Trans>Apply</Trans>
          </Button>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <Text
          style={{
            color: themeStyle.errorText,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
