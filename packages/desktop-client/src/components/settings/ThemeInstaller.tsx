import React, { useState, useCallback, useEffect } from 'react';
import { TextArea } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';
import AutoSizer from 'react-virtualized-auto-sizer';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '@desktop-client/components/common/Link';
import { FixedSizeList } from '@desktop-client/components/FixedSizeList';
import customThemeCatalog from '@desktop-client/data/customThemeCatalog.json';
import {
  type CatalogTheme,
  type InstalledTheme,
  fetchThemeCss,
  validateThemeCss,
  generateThemeId,
  normalizeGitHubRepo,
  getThemeScreenshotUrl,
  extractRepoOwner,
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
  const [pastedCss, setPastedCss] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize pastedCss with installed custom theme CSS if it exists
  useEffect(() => {
    // If there's an installed theme with empty repo (custom pasted CSS), restore it
    if (installedTheme && !installedTheme.repo) {
      setPastedCss(installedTheme.cssContent);
    }
  }, [installedTheme]);

  // TODO: inlined for now, but eventually we will fetch this from github directly
  const catalog = customThemeCatalog as CatalogTheme[];

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

  const installTheme = useCallback(
    async (options: {
      css: string | Promise<string>;
      name: string;
      repo: string;
      id: string;
      errorMessage: string;
    }) => {
      setError(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : options.errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [onInstall],
  );

  const handleCatalogThemeClick = useCallback(
    async (theme: CatalogTheme) => {
      setSelectedCatalogTheme(theme);
      setPastedCss('');

      const normalizedRepo = normalizeGitHubRepo(theme.repo);
      await installTheme({
        css: fetchThemeCss(theme.repo),
        name: theme.name,
        repo: normalizedRepo,
        id: generateThemeId(normalizedRepo),
        errorMessage: t('Failed to load theme'),
      });
    },
    [installTheme, t],
  );

  const handlePastedCssChange = useCallback((value: string) => {
    setPastedCss(value);
    setSelectedCatalogTheme(null);
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
      <View
        style={{
          height: CATALOG_MAX_HEIGHT,
          marginBottom: 16,
        }}
      >
        <AutoSizer>
          {({ width, height }) => {
            if (width === 0 || height === 0) {
              return null;
            }

            const itemsPerRow = getItemsPerRow(width);
            const rows: CatalogTheme[][] = [];
            for (let i = 0; i < catalog.length; i += itemsPerRow) {
              rows.push(catalog.slice(i, i + itemsPerRow));
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
                                isSelected
                                  ? themeStyle.buttonPrimaryBackground
                                  : themeStyle.tableBorder
                              }`,
                              backgroundColor: isSelected
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
                                backgroundColor: themeStyle.overlayBackground,
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
                            <img
                              src={getThemeScreenshotUrl(theme.repo)}
                              alt={theme.name}
                              style={{
                                width: '100%',
                                height: 60,
                                objectFit: 'cover',
                                borderRadius: 4,
                              }}
                            />
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
                                style={{ color: themeStyle.pageTextSubdued }}
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
        </AutoSizer>
      </View>

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
            height: 120,
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
