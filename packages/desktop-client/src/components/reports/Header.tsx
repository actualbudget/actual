import type { ComponentProps, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { RuleConditionEntity, TimeFrame } from 'loot-core/types/models';
import type { SyncedPrefs } from 'loot-core/types/prefs';

import { getLiveRange } from './getLiveRange';
import {
  calculateTimeRange,
  getFullRange,
  getLatestRange,
  validateEnd,
  validateStart,
} from './reportRanges';

import { AppliedFilters } from '@desktop-client/components/filters/AppliedFilters';
import { FilterButton } from '@desktop-client/components/filters/FiltersMenu';
import { useLocale } from '@desktop-client/hooks/useLocale';

type HeaderProps = {
  start: TimeFrame['start'];
  end: TimeFrame['end'];
  mode?: TimeFrame['mode'];
  show1Month?: boolean;
  allMonths: Array<{ name: string; pretty: string }>;
  earliestTransaction: string;
  latestTransaction: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onChangeDates: (
    start: TimeFrame['start'],
    end: TimeFrame['end'],
    mode: TimeFrame['mode'],
  ) => void;
  children?: ReactNode;
  inlineContent?: ReactNode;
  // no separate category filter; use main filters instead
  filterExclude?: string[];
} & (
  | {
      filters: RuleConditionEntity[];
      onApply: (conditions: RuleConditionEntity) => void;
      onUpdateFilter: ComponentProps<typeof AppliedFilters>['onUpdate'];
      onDeleteFilter: ComponentProps<typeof AppliedFilters>['onDelete'];
      conditionsOp: 'and' | 'or';
      onConditionsOpChange: ComponentProps<
        typeof AppliedFilters
      >['onConditionsOpChange'];
    }
  | {
      filters?: never;
      onApply?: never;
      onUpdateFilter?: never;
      onDeleteFilter?: never;
      conditionsOp?: never;
      onConditionsOpChange?: never;
    }
);

export function Header({
  start,
  end,
  mode,
  show1Month,
  allMonths,
  earliestTransaction,
  latestTransaction,
  firstDayOfWeekIdx,
  onChangeDates,
  filters,
  conditionsOp,
  onApply,
  onUpdateFilter,
  onDeleteFilter,
  onConditionsOpChange,
  children,
  inlineContent,
  filterExclude,
}: HeaderProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  function convertToMonth(
    start: string,
    end: string,
    _: TimeFrame['mode'],
    mode: TimeFrame['mode'],
  ): [string, string, TimeFrame['mode']] {
    return [monthUtils.getMonth(start), monthUtils.getMonth(end), mode];
  }

  return (
    <View
      style={{
        padding: 20,
        paddingTop: 15,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          display: 'grid',
          alignItems: isNarrowWidth ? 'flex-start' : 'center',
        }}
      >
        <View
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            flexDirection: 'row',
          }}
        >
          <SpaceBetween gap={isNarrowWidth ? 5 : undefined}>
            {mode && (
              <Button
                variant={mode === 'static' ? 'normal' : 'primary'}
                onPress={() => {
                  const newMode =
                    mode === 'static' ? 'sliding-window' : 'static';
                  const [newStart, newEnd] = calculateTimeRange({
                    start,
                    end,
                    mode: newMode,
                  });

                  onChangeDates(newStart, newEnd, newMode);
                }}
              >
                {mode === 'static' ? t('Static') : t('Live')}
              </Button>
            )}

            <SpaceBetween gap={5}>
              <Select
                onChange={newValue =>
                  onChangeDates(
                    ...validateStart(
                      allMonths[allMonths.length - 1].name,
                      allMonths[0].name,
                      newValue,
                      end,
                    ),
                  )
                }
                value={start}
                defaultLabel={monthUtils.format(start, 'MMMM yyyy', locale)}
                options={allMonths.map(({ name, pretty }) => [name, pretty])}
              />
              <View>{t('to')}</View>
              <Select
                onChange={newValue =>
                  onChangeDates(
                    ...validateEnd(
                      allMonths[allMonths.length - 1].name,
                      allMonths[0].name,
                      start,
                      newValue,
                    ),
                  )
                }
                value={end}
                options={allMonths.map(({ name, pretty }) => [name, pretty])}
                style={{ marginRight: 10 }}
              />
            </SpaceBetween>
          </SpaceBetween>

          <SpaceBetween gap={3}>
            {show1Month && (
              <Button
                variant="bare"
                onPress={() => onChangeDates(...getLatestRange(0))}
              >
                <Trans>1 month</Trans>
              </Button>
            )}
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(2))}
            >
              <Trans>3 months</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(5))}
            >
              <Trans>6 months</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(11))}
            >
              <Trans>1 year</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...convertToMonth(
                    ...getLiveRange(
                      'Year to date',
                      earliestTransaction,
                      latestTransaction,
                      true,
                      firstDayOfWeekIdx,
                    ),
                    'yearToDate',
                  ),
                )
              }
            >
              <Trans>Year to date</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...convertToMonth(
                    ...getLiveRange(
                      'Last month',
                      earliestTransaction,
                      latestTransaction,
                      false,
                      firstDayOfWeekIdx,
                    ),
                    'lastMonth',
                  ),
                )
              }
            >
              <Trans>Last month</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...convertToMonth(
                    ...getLiveRange(
                      'Last year',
                      earliestTransaction,
                      latestTransaction,
                      false,
                      firstDayOfWeekIdx,
                    ),
                    'lastYear',
                  ),
                )
              }
            >
              <Trans>Last year</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...convertToMonth(
                    ...getLiveRange(
                      'Prior year to date',
                      earliestTransaction,
                      latestTransaction,
                      false,
                      firstDayOfWeekIdx,
                    ),
                    'priorYearToDate',
                  ),
                )
              }
            >
              <Trans>Prior year to date</Trans>
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...getFullRange(
                    allMonths[allMonths.length - 1].name,
                    allMonths[0].name,
                  ),
                )
              }
            >
              <Trans>All time</Trans>
            </Button>

            {filters && (
              <FilterButton
                compact={isNarrowWidth}
                onApply={onApply}
                hover={false}
                exclude={filterExclude}
              />
            )}
            {inlineContent}
          </SpaceBetween>
        </View>

        {children && (
          <View
            style={{
              gridColumn: 2,
              flexDirection: 'row',
              justifySelf: 'flex-end',
              alignSelf: 'flex-start',
            }}
          >
            {children}
          </View>
        )}
      </View>

      {filters && filters.length > 0 && (
        <View style={{ marginTop: 5 }}>
          <AppliedFilters
            conditions={filters}
            onUpdate={onUpdateFilter}
            onDelete={onDeleteFilter}
            conditionsOp={conditionsOp}
            onConditionsOpChange={onConditionsOpChange}
          />
        </View>
      )}
    </View>
  );
}
