import { type ComponentProps, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  type RuleConditionEntity,
  type TimeFrame,
} from 'loot-core/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgPause, SvgPlay } from '../../icons/v1';
import { useResponsive } from '../../ResponsiveProvider';
import { Button } from '../common/Button2';
import { Select } from '../common/Select';
import { View } from '../common/View';
import { AppliedFilters } from '../filters/AppliedFilters';
import { FilterButton } from '../filters/FiltersMenu';

import {
  getFullRange,
  getLatestRange,
  validateEnd,
  validateStart,
} from './reportRanges';

type HeaderProps = {
  start: TimeFrame['start'];
  end: TimeFrame['end'];
  mode?: TimeFrame['mode'];
  show1Month?: boolean;
  allMonths: Array<{ name: string; pretty: string }>;
  onChangeDates: (
    start: TimeFrame['start'],
    end: TimeFrame['end'],
    mode: TimeFrame['mode'],
  ) => void;
  filters?: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  onApply?: (conditions: RuleConditionEntity) => void;
  onUpdateFilter: ComponentProps<typeof AppliedFilters>['onUpdate'];
  onDeleteFilter: ComponentProps<typeof AppliedFilters>['onDelete'];
  onConditionsOpChange: ComponentProps<
    typeof AppliedFilters
  >['onConditionsOpChange'];
  children?: ReactNode;
};

export function Header({
  start,
  end,
  mode,
  show1Month,
  allMonths,
  onChangeDates,
  filters,
  conditionsOp,
  onApply,
  onUpdateFilter,
  onDeleteFilter,
  onConditionsOpChange,
  children,
}: HeaderProps) {
  const isDashboardsFeatureEnabled = useFeatureFlag('dashboards');
  const location = useLocation();
  const path = location.pathname;
  const { isNarrowWidth } = useResponsive();

  return (
    <View
      style={{
        padding: 20,
        paddingTop: 0,
        flexShrink: 0,
      }}
    >
      {!['/reports/custom', '/reports/spending'].includes(path) && (
        <View
          style={{
            flexDirection: isNarrowWidth ? 'column' : 'row',
            alignItems: isNarrowWidth ? 'flex-start' : 'center',
            marginTop: 15,
            gap: 15,
          }}
        >
          {isDashboardsFeatureEnabled && mode && (
            <Button
              variant={mode === 'static' ? 'normal' : 'primary'}
              onPress={() =>
                onChangeDates(
                  start,
                  end,
                  mode === 'static' ? 'sliding-window' : 'static',
                )
              }
              Icon={mode === 'static' ? SvgPause : SvgPlay}
            >
              {mode === 'static' ? 'Paused' : 'Live'}
            </Button>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Select
              onChange={newValue =>
                onChangeDates(
                  ...validateStart(
                    allMonths[allMonths.length - 1].name,
                    newValue,
                    end,
                  ),
                )
              }
              value={monthUtils.monthFromDate(start)}
              defaultLabel={monthUtils.format(start, 'MMMM, yyyy')}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
            <View>to</View>
            <Select
              onChange={newValue =>
                onChangeDates(
                  ...validateEnd(
                    allMonths[allMonths.length - 1].name,
                    start,
                    newValue,
                  ),
                )
              }
              value={monthUtils.monthFromDate(end)}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
              buttonStyle={{ marginRight: 10 }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 15,
              flexWrap: 'wrap',
            }}
          >
            {show1Month && (
              <Button
                variant="bare"
                onPress={() => onChangeDates(...getLatestRange(1))}
              >
                1 month
              </Button>
            )}
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(2))}
            >
              3 months
            </Button>
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(5))}
            >
              6 months
            </Button>
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(11))}
            >
              1 Year
            </Button>
            <Button
              variant="bare"
              onPress={() =>
                onChangeDates(
                  ...getFullRange(allMonths[allMonths.length - 1].name),
                )
              }
            >
              All Time
            </Button>

            {filters && (
              <FilterButton
                compact={isNarrowWidth}
                onApply={onApply}
                hover={false}
                exclude={undefined}
              />
            )}
          </View>

          {children ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              {children}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      )}
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
