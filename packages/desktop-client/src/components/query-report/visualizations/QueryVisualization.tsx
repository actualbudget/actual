import type { QueryVisualization as QueryVisualizationType } from 'loot-core/types/models/dashboard';

import { QueryBarChart } from './QueryBarChart';
import { QueryDonut } from './QueryDonut';
import { QueryScalar } from './QueryScalar';
import { QueryTimeSeries } from './QueryTimeSeries';

import { QueryResultTable } from '@desktop-client/components/reports/reports/QueryResultTable';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type QueryVisualizationProps = {
  result: QueryResult;
  config: QueryVisualizationType;
  compact?: boolean;
};

export function QueryVisualization({
  result,
  config,
  compact = false,
}: QueryVisualizationProps) {
  switch (config.type) {
    case 'table':
      return <QueryResultTable result={result} compact={compact} />;
    case 'scalar':
      return (
        <QueryScalar result={result} measureColumn={config.measureColumn} />
      );
    case 'time-series':
      return (
        <QueryTimeSeries result={result} config={config} compact={compact} />
      );
    case 'bar':
      return (
        <QueryBarChart result={result} config={config} compact={compact} />
      );
    case 'donut':
      return <QueryDonut result={result} config={config} compact={compact} />;
    default:
      return <QueryResultTable result={result} compact={compact} />;
  }
}
