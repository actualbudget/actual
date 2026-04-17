import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

import { useMetadataPref } from '#hooks/useMetadataPref';

type ForecastModeButtonProps = {
  style?: CSSProperties;
};

export function ForecastModeButton({ style }: ForecastModeButtonProps) {
  const { t } = useTranslation();
  const [forecastMode = false, setForecastModePref] = useMetadataPref(
    'budget.forecastMode',
  );

  return (
    <Button
      variant="bare"
      aria-label={
        forecastMode ? t('Disable forecast mode') : t('Enable forecast mode')
      }
      onPress={() => setForecastModePref(!forecastMode)}
      style={{
        ...style,
        color: forecastMode ? theme.pageText : theme.pageTextSubdued,
        fontWeight: forecastMode ? 600 : 400,
      }}
    >
      <Trans>Forecast</Trans>
    </Button>
  );
}
