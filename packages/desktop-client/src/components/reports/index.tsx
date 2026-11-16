import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { LoadComponent } from '#components/util/LoadComponent';

const loadReportRouter = () =>
  import(/* webpackChunkName: 'reports' */ './ReportRouter');

export function Reports() {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <LoadComponent
        name="ReportRouter"
        message={t('Loading reports...')}
        importer={loadReportRouter}
      />
    </View>
  );
}
