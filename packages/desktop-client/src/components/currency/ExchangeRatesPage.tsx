import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { MobilePageHeader, Page } from '#components/Page';
import { SettingsBackButton } from '#components/settings/SettingsBackButton';
import { useMultiCurrency } from '#hooks/useMultiCurrency';

import { ExchangeRates } from './ExchangeRates';

export function ExchangeRatesPage() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const { isEnabled } = useMultiCurrency();

  // The page only exists while multiple currencies are on
  if (!isEnabled) {
    return <Navigate to="/settings" replace />;
  }

  if (!isNarrowWidth) {
    return <ExchangeRates />;
  }

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Exchange Rates')}
          leftContent={<SettingsBackButton />}
        />
      }
    >
      <ExchangeRates />
    </Page>
  );
}
