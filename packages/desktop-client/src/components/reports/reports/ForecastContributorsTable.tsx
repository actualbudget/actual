import { useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { ForecastContributor } from '@actual-app/core/shared/forecast-contributors';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { ForecastAmount } from '#components/reports/reports/ForecastAmount';

type ForecastContributorsTableProps = {
  contributors: ForecastContributor[];
  direction: 'inflow' | 'outflow';
  onEditSchedule: (id: string) => void;
  isUpdating: boolean;
};

export function ForecastContributorsTable({
  contributors,
  direction,
  onEditSchedule,
  isUpdating,
}: ForecastContributorsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const visible = showAll ? contributors : contributors.slice(0, 5);
  const remaining = contributors.slice(visible.length);
  const total = contributors.reduce(
    (sum, contributor) => sum + contributor.amount,
    0,
  );

  return (
    <View style={{ minWidth: 0, flex: '1 1 360px' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
      >
        <caption
          style={{ textAlign: 'left', fontWeight: 600, marginBottom: 8 }}
        >
          {direction === 'inflow' ? (
            <Trans>Scheduled inflows</Trans>
          ) : (
            <Trans>Scheduled outflows</Trans>
          )}
        </caption>
        <thead>
          <tr style={{ color: theme.pageTextLight, fontSize: 12 }}>
            <th scope="col" style={{ fontWeight: 400, padding: '4px 0' }}>
              <Trans>Schedule</Trans>
            </th>
            <th
              scope="col"
              style={{
                fontWeight: 400,
                padding: '4px 8px',
                textAlign: 'right',
              }}
            >
              <Trans>Occurrences</Trans>
            </th>
            <th
              scope="col"
              style={{ fontWeight: 400, padding: '4px 0', textAlign: 'right' }}
            >
              <Trans>Net amount</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map(contributor => (
            <tr
              key={contributor.scheduleId}
              style={{ borderTop: `1px solid ${theme.tableBorder}` }}
            >
              <td style={{ padding: '2px 0', overflowWrap: 'anywhere' }}>
                <Button
                  variant="bare"
                  style={{
                    fontWeight: 500,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    minHeight: isNarrowWidth ? 40 : undefined,
                  }}
                  isDisabled={isUpdating}
                  onPress={() => onEditSchedule(contributor.scheduleId)}
                >
                  <PrivacyFilter>
                    {contributor.scheduleName || (
                      <Trans>Unnamed schedule</Trans>
                    )}
                  </PrivacyFilter>
                </Button>
                {contributor.isAccountless && (
                  <View style={{ color: theme.pageTextLight, fontSize: 12 }}>
                    <Trans>No account assigned</Trans>
                  </View>
                )}
                {contributor.isTransfer && (
                  <View style={{ color: theme.pageTextLight, fontSize: 12 }}>
                    <Trans>Transfer</Trans>
                  </View>
                )}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px' }}>
                {contributor.count}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 0' }}>
                <ForecastAmount amount={contributor.amount} />
              </td>
            </tr>
          ))}
          {remaining.length > 0 && (
            <tr
              style={{
                borderTop: `1px solid ${theme.tableBorder}`,
                color: theme.pageTextLight,
              }}
            >
              <td style={{ padding: '8px 5px' }}>
                <Trans count={remaining.length}>
                  Other {{ count: remaining.length }} schedules
                </Trans>
              </td>
              <td style={{ textAlign: 'right', padding: '8px' }}>
                {remaining.reduce(
                  (sum, contributor) => sum + contributor.count,
                  0,
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <ForecastAmount
                  amount={remaining.reduce(
                    (sum, contributor) => sum + contributor.amount,
                    0,
                  )}
                />
              </td>
            </tr>
          )}
          {contributors.length === 0 && (
            <tr>
              <td
                colSpan={3}
                style={{ padding: '12px 0', color: theme.pageTextLight }}
              >
                <Trans>No scheduled contributions in this direction.</Trans>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr
            style={{
              borderTop: `1px solid ${theme.tableBorder}`,
              fontWeight: 600,
            }}
          >
            <th scope="row" colSpan={2} style={{ padding: '8px 0' }}>
              <Trans>Total</Trans>
            </th>
            <td style={{ textAlign: 'right' }}>
              <ForecastAmount amount={total} />
            </td>
          </tr>
        </tfoot>
      </table>
      {contributors.length > 5 && (
        <Button
          variant="bare"
          style={{
            alignSelf: 'flex-start',
            color: theme.pageTextLink,
            minHeight: isNarrowWidth ? 40 : undefined,
          }}
          aria-expanded={showAll}
          onPress={() => setShowAll(!showAll)}
        >
          {showAll ? <Trans>Show top five</Trans> : <Trans>Show all</Trans>}
        </Button>
      )}
    </View>
  );
}
