import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import type { ForecastSeries } from '@actual-app/core/types/models/forecast';
import { v4 as uuidv4 } from 'uuid';

import { AppliedFilters } from '#components/filters/AppliedFilters';
import { FilterButton } from '#components/filters/FiltersMenu';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useAccounts } from '#hooks/useAccounts';

import { MAX_FORECAST_SERIES } from './balanceForecastSeries';
import { ForecastSeriesKey } from './ForecastSeriesKey';

export function ForecastSeriesEditor({
  series,
  onChange,
}: {
  series: ForecastSeries[];
  onChange: (series: ForecastSeries[]) => void;
}) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();

  function updateLine(id: string, changes: Partial<ForecastSeries>) {
    onChange(
      series.map(line => (line.id === id ? { ...line, ...changes } : line)),
    );
  }

  return (
    <View
      id="forecast-series-editor"
      style={{ gap: 12, padding: '16px 0', flexShrink: 0 }}
    >
      {series.map((line, index) => (
        <View
          key={line.id}
          role="group"
          aria-label={t('Forecast line {{number}}', { number: index + 1 })}
          style={{
            gap: 8,
            paddingBottom: 12,
            borderBottom: `1px solid ${theme.tableBorder}`,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <ForecastSeriesKey
              index={index}
              name={t('Line {{number}}', { number: index + 1 })}
            />
            <Input
              aria-label={t('Line {{number}} name', { number: index + 1 })}
              value={line.name}
              maxLength={80}
              onChange={event =>
                updateLine(line.id, { name: event.target.value })
              }
              style={{ width: 200, maxWidth: '100%' }}
            />
            <FilterButton
              compact={false}
              hover={false}
              onApply={(
                filter:
                  | RuleConditionEntity
                  | {
                      conditions: RuleConditionEntity[];
                      conditionsOp: 'and' | 'or';
                    }
                  | null,
              ) => {
                if (filter === null) {
                  updateLine(line.id, { conditions: [] });
                } else if ('conditions' in filter) {
                  updateLine(line.id, {
                    conditions: filter.conditions,
                    conditionsOp: filter.conditionsOp,
                  });
                } else {
                  updateLine(line.id, {
                    conditions: [...line.conditions, filter],
                  });
                }
              }}
            />
            <Button
              variant="bare"
              isDisabled={series.length === 1}
              aria-label={t('Remove line {{number}}', { number: index + 1 })}
              onPress={() =>
                onChange(series.filter(item => item.id !== line.id))
              }
            >
              <Trans>Remove</Trans>
            </Button>
          </View>
          {line.accounts !== undefined && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span>
                <Trans>Saved account selection</Trans>:{' '}
                <PrivacyFilter>
                  {accounts
                    .filter(account => line.accounts?.includes(account.id))
                    .map(account => account.name)
                    .join(', ') || t('No accounts')}
                </PrivacyFilter>
              </span>
              <Button
                variant="bare"
                onPress={() => updateLine(line.id, { accounts: undefined })}
              >
                <Trans>Clear account limit</Trans>
              </Button>
            </View>
          )}
          {line.conditions.length ? (
            <AppliedFilters
              conditions={line.conditions}
              conditionsOp={line.conditionsOp}
              onUpdate={(oldFilter, newFilter) =>
                updateLine(line.id, {
                  conditions: line.conditions.map(filter =>
                    filter === oldFilter ? newFilter : filter,
                  ),
                })
              }
              onDelete={deleted =>
                updateLine(line.id, {
                  conditions: line.conditions.filter(
                    filter => filter !== deleted,
                  ),
                })
              }
              onConditionsOpChange={conditionsOp =>
                updateLine(line.id, { conditionsOp })
              }
            />
          ) : (
            <span style={{ color: theme.pageTextLight }}>
              <Trans>No transaction filters</Trans>
            </span>
          )}
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Button
          isDisabled={series.length >= MAX_FORECAST_SERIES}
          onPress={() =>
            onChange([
              ...series,
              {
                id: uuidv4(),
                name: t('Line {{number}}', { number: series.length + 1 }),
                conditions: [],
                conditionsOp: 'and',
              },
            ])
          }
        >
          <Trans>Add line</Trans>
        </Button>
        <span style={{ color: theme.pageTextLight }}>
          <Trans>
            Compare up to four lines. To combine accounts, select them in one
            line's filters.
          </Trans>
        </span>
      </View>
    </View>
  );
}
