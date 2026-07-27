import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgShowSidebar } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';

import { nextWidthMode } from './widthMode';
import type { WidthMode } from './widthMode';

type WidthToggleButtonProps = {
  widthMode: WidthMode;
  onChange: (mode: WidthMode) => void;
};

const widthModeLabel = (t: (key: string) => string, mode: WidthMode) => {
  switch (mode) {
    case 'rail':
      return t('Rail width');
    case 'compact':
      return t('Compact width');
    case 'full':
      return t('Full width');
    default:
      return mode;
  }
};

export function WidthToggleButton({
  widthMode,
  onChange,
}: WidthToggleButtonProps) {
  const { t } = useTranslation();
  const next = nextWidthMode(widthMode);

  return (
    <Button
      variant="bare"
      aria-label={t('Switch sidebar width: {{current}} → {{next}}', {
        current: widthModeLabel(t, widthMode),
        next: widthModeLabel(t, next),
      })}
      onPress={() => onChange(next)}
      style={{ color: theme.pageTextSubdued, flexShrink: 0 }}
    >
      <SvgShowSidebar width={15} height={15} />
    </Button>
  );
}
