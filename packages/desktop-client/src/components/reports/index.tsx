import { useTranslation } from 'react-i18next';

import { View } from '../common/View';
import { LoadComponent } from '../util/LoadComponent';

export function Reports() {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <LoadComponent
        name="ReportRouter"
        message={t('Loading reports...')}
        importer={() =>
          import(/* webpackChunkName: 'reports' */ './ReportRouter')
        }
      />
    </View>
  );
}
