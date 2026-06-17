import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

type NumberMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  compact?: boolean;
};

export function NumberMark({ result, resolved, compact }: NumberMarkProps) {
  const format = useFormat();

  const yChannel = resolved.encoding.y;
  const yField =
    yChannel && !Array.isArray(yChannel) ? yChannel.field : undefined;

  if (!yField) {
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

  const value = result.rows[0]?.[yField];

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
        fontSize: compact ? 24 : 28,
        fontWeight: 600,
        color: theme.pageText,
      }}
    >
      {format(value, 'financial')}
    </View>
  );
}
