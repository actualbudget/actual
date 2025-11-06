import { useTranslation } from 'react-i18next';

import { BudgetViews } from './BudgetViews';

import { Page } from '@desktop-client/components/Page';

export function BudgetViewsPage() {
  const { t } = useTranslation();

  return (
    <Page
      header={t('Budget Views')}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <BudgetViews />
    </Page>
  );
}
