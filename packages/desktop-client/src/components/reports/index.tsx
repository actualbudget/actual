import { View } from '../common/View';
import { LoadComponent } from '../util/LoadComponent';

export function Reports() {
  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <LoadComponent
        name="ReportRouter"
        message="Loading reports..."
        importer={() =>
          import(/* webpackChunkName: 'reports' */ './ReportRouter')
        }
      />
    </View>
  );
}
