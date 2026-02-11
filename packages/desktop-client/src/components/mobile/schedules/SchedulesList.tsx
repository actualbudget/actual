import { GridList, ListLayout, Virtualizer } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ScheduleStatusType } from 'loot-core/shared/schedules';
import type { ScheduleEntity } from 'loot-core/types/models';

import { SchedulesListItem } from './SchedulesListItem';

import { ActionableGridListItem } from '@desktop-client/components/mobile/ActionableGridListItem';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

type CompletedSchedulesItem = { id: 'show-completed' };
type SchedulesListEntry = ScheduleEntity | CompletedSchedulesItem;

type SchedulesListProps = {
  schedules: readonly ScheduleEntity[];
  isLoading: boolean;
  statuses: Map<ScheduleEntity['id'], ScheduleStatusType>;
  onSchedulePress: (schedule: ScheduleEntity) => void;
  onScheduleDelete: (schedule: ScheduleEntity) => void;
  hasCompletedSchedules?: boolean;
  showCompleted?: boolean;
  onShowCompleted?: () => void;
};

export function SchedulesList({
  schedules,
  isLoading,
  statuses,
  onSchedulePress,
  onScheduleDelete,
  hasCompletedSchedules = false,
  showCompleted = false,
  onShowCompleted,
}: SchedulesListProps) {
  const { t } = useTranslation();
  const shouldShowCompletedItem =
    hasCompletedSchedules && !showCompleted && onShowCompleted;
  const listItems: readonly SchedulesListEntry[] = shouldShowCompletedItem
    ? [...schedules, { id: 'show-completed' }]
    : schedules;
  const showCompletedLabel = t('Show completed schedules');

  if (isLoading && listItems.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        <AnimatedLoading style={{ width: 25, height: 25 }} />
      </View>
    );
  }

  if (listItems.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextSubdued,
            textAlign: 'center',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          {t('No schedules found. Create your first schedule to get started!')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, overflow: 'auto' }}>
      <Virtualizer
        layout={ListLayout}
        layoutOptions={{
          estimatedRowHeight: 140,
          padding: 0,
        }}
      >
        <GridList
          aria-label={t('Schedules')}
          aria-busy={isLoading || undefined}
          items={listItems}
          style={{
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          {item =>
            !('completed' in item) ? (
              <ActionableGridListItem
                id="show-completed"
                value={item}
                textValue={showCompletedLabel}
                onAction={onShowCompleted}
              >
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontStyle: 'italic',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Trans>Show completed schedules</Trans>
                  </Text>
                </View>
              </ActionableGridListItem>
            ) : (
              <SchedulesListItem
                value={item}
                status={statuses.get(item.id) || 'scheduled'}
                onAction={() => onSchedulePress(item)}
                onDelete={() => onScheduleDelete(item)}
              />
            )
          }
        </GridList>
      </Virtualizer>
      {isLoading && (
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </View>
  );
}
