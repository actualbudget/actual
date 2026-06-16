import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import { assignColumns } from '@desktop-client/queries/columnRoles';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type QueryScalarProps = {
  result: QueryResult;
  measureColumn?: string;
};

export function QueryScalar({ result, measureColumn }: QueryScalarProps) {
  const format = useFormat();

  // `result.scalar` is set by `processQueryResult` for single-value
  // calculation queries — it bypasses the column-lookup entirely.
  if (typeof result.scalar === 'number') {
    return (
      <View
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 28,
          fontWeight: 600,
          color: theme.pageText,
        }}
      >
        {format(result.scalar, 'financial')}
      </View>
    );
  }

  const assignment = assignColumns(result);
  const column = measureColumn ?? assignment.measureColumns[0];
  const value = column ? result.rows[0]?.[column] : undefined;

  if (typeof value !== 'number') {
    return (
      <View
        style={{
          padding: 20,
          color: theme.pageTextSubdued,
          textAlign: 'center',
        }}
      >
        <Trans>No numeric result to display</Trans>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 28,
        fontWeight: 600,
        color: theme.pageText,
      }}
    >
      {format(value, 'financial')}
    </View>
  );
}
