import { type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  type RuleConditionEntity,
  type TimeFrame,
} from 'loot-core/types/models';

import { Button } from '../common/Button2';
import { Select } from '../common/Select';
import { SpaceBetween } from '../common/SpaceBetween';
import { View } from '../common/View';
import { AppliedFilters } from '../filters/AppliedFilters';
import { FilterButton } from '../filters/FiltersMenu';
import { useResponsive } from '../responsive/ResponsiveProvider';

import {
  calculateTimeRange,
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
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  return (
    <View
      style={{
        padding: 20,
        paddingTop: 15,
        flexShrink: 0,
      }}
    >
      <SpaceBetween
        direction={isNarrowWidth ? 'vertical' : 'horizontal'}
        style={{
          alignItems: isNarrowWidth ? 'flex-start' : 'center',
        }}
      >
        <SpaceBetween gap={isNarrowWidth ? 5 : undefined}>
          {mode && (
            <Button
              variant={mode === 'static' ? 'normal' : 'primary'}
              onPress={() => {
                const newMode = mode === 'static' ? 'sliding-window' : 'static';
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
                    newValue,
                    end,
                  ),
                )
              }
              value={start}
              defaultLabel={monthUtils.format(start, 'MMMM, yyyy')}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
            <View>{t('to')}</View>
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
              value={end}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
              style={{ marginRight: 10 }}
            />
          </SpaceBetween>
        </SpaceBetween>

        <SpaceBetween>
          {show1Month && (
            <Button
              variant="bare"
              onPress={() => onChangeDates(...getLatestRange(1))}
            >
              {t('1 month')}
            </Button>
          )}
          <Button
            variant="bare"
            onPress={() => onChangeDates(...getLatestRange(2))}
          >
            {t('3 months')}
          </Button>
          <Button
            variant="bare"
            onPress={() => onChangeDates(...getLatestRange(5))}
          >
            {t('6 months')}
          </Button>
          <Button
            variant="bare"
            onPress={() => onChangeDates(...getLatestRange(11))}
          >
            {t('1 Year')}
          </Button>
          <Button
            variant="bare"
            onPress={() =>
              onChangeDates(
                ...getFullRange(allMonths[allMonths.length - 1].name),
              )
            }
          >
            {t('All Time')}
          </Button>

          {filters && (
            <FilterButton
              compact={isNarrowWidth}
              onApply={onApply}
              hover={false}
              exclude={undefined}
            />
          )}
        </SpaceBetween>

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
      </SpaceBetween>

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
