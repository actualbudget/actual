import { useState } from 'react';
import { parseColor } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { DEFAULT_COLOR_SET } from '@actual-app/components/color-picker';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { useLanguage } from '#hooks/useLocale';
import { useTagCSS } from '#hooks/useTagCSS';
import type { Modal as ModalType } from '#modals/modalsSlice';

const SWATCH_SIZE = 44;

type TagColorModalProps = Extract<ModalType, { name: 'tag-color' }>['options'];

function parseHexColor(value: string) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function TagColorModal({
  tagName,
  color: initialColor,
  onSelect,
}: TagColorModalProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const getTagCSS = useTagCSS({ ellipsis: true });
  const [color, setColor] = useState(initialColor);
  const [hex, setHex] = useState(initialColor ?? '');

  const onHexChange = (value: string) => {
    setHex(value);
    const parsed = parseHexColor(value);
    if (parsed != null) {
      setColor(parsed);
      onSelect(parsed);
    }
  };

  return (
    <MobileSheet name="tag-color" title={t('Color')}>
      {({ close }) => {
        const pick = (newColor: string | null) => {
          onSelect(newColor);
          close();
        };

        return (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.xs}px ${spacing.lg}px ${spacing.md}px`,
                flexShrink: 0,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <span
                  className={getTagCSS('', { color })}
                  style={{ fontSize: 15, cursor: 'default' }}
                >
                  #{tagName}
                </span>
              </View>
              <Input
                aria-label={t('Hex color')}
                placeholder="#RRGGBB"
                value={hex}
                onChangeValue={onHexChange}
                onEnter={close}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: 110,
                  height: styles.mobileMinHeight,
                  flexShrink: 0,
                }}
              />
            </View>
            <MobileSheetRow
              label={<Trans>Theme default</Trans>}
              onPress={() => pick(null)}
            />
            <fieldset
              aria-label={t('Colors')}
              style={{
                margin: 0,
                minWidth: 0,
                border: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${SWATCH_SIZE}px, 1fr))`,
                gap: spacing.sm,
                padding: spacing.lg,
                borderTop: `1px solid ${theme.tooltipBorder}`,
                flexShrink: 0,
              }}
            >
              {DEFAULT_COLOR_SET.map(swatch => {
                const swatchColor = swatch.toUpperCase();
                const isSelected = color?.toUpperCase() === swatchColor;
                return (
                  <Button
                    key={swatchColor}
                    variant="bare"
                    aria-label={`${parseColor(swatchColor).getColorName(language)}, ${swatchColor}`}
                    aria-pressed={isSelected}
                    onPress={() => pick(swatchColor)}
                    style={{
                      height: SWATCH_SIZE,
                      minWidth: SWATCH_SIZE,
                      padding: 0,
                      borderRadius: radius.sm,
                      backgroundColor: swatchColor,
                      border: `1px solid ${theme.tooltipBorder}`,
                      boxShadow: isSelected
                        ? `0 0 0 2px ${theme.modalBackground}, 0 0 0 4px ${theme.pageTextDark}`
                        : 'none',
                    }}
                  />
                );
              })}
            </fieldset>
          </>
        );
      }}
    </MobileSheet>
  );
}
