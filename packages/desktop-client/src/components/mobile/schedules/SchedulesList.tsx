import { GridList, ListLayout, Virtualizer } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ScheduleStatusLookup } from 'loot-core/shared/schedules';
import type { ScheduleEntity } from 'loot-core/types/models';

import { ROW_HEIGHT, SchedulesListItem } from './SchedulesListItem';

import { ActionableGridListItem } from '@desktop-client/components/mobile/ActionableGridListItem';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

type CompletedSchedulesItem = { id: 'show-completed' };
type SchedulesListEntry = ScheduleEntity | CompletedSchedulesItem;

type SchedulesListProps = {
  schedules: readonly ScheduleEntity[];
  isLoading: boolean;
  statusLookup: ScheduleStatusLookup;
  onSchedulePress: (schedule: ScheduleEntity) => void;
  onScheduleDelete: (schedule: ScheduleEntity) => void;
  hasCompletedSchedules?: boolean;
  showCompleted?: boolean;
  onShowCompleted?: () => void;
};

export function SchedulesList({
  schedules,
  isLoading,
  statusLookup,
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

  if (isLoading) {
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

  return (
    <View style={{ flex: 1, overflow: 'auto' }}>
      <Virtualizer
        layout={ListLayout}
        layoutOptions={{
          estimatedRowHeight: ROW_HEIGHT,
        }}
      >
        <GridList
          aria-label={t('Schedules')}
          aria-busy={isLoading || undefined}
          items={listItems}
          dependencies={[statusLookup]}
          style={{
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
          renderEmptyState={() => (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.mobilePageBackground,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: theme.pageTextSubdued,
                  textAlign: 'center',
                }}
              >
                <Trans>
                  No schedules found. Create your first schedule to get started!
                </Trans>
              </Text>
            </View>
          )}
        >
          {item =>
            !('completed' in item) ? (
              <ActionableGridListItem
                id="show-completed"
                value={item}
                textValue={t('Show completed schedules')}
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
                status={statusLookup[item.id] || 'scheduled'}
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
