import { LoadComponent } from '../util/LoadComponent';

export function Reports() {
  return (
    <LoadComponent
      data-testid="reports-page"
      name="ReportRouter"
      message="Loading reports..."
      importer={() =>
        import(/* webpackChunkName: 'reports' */ './ReportRouter')
      }
    />
  );
}
