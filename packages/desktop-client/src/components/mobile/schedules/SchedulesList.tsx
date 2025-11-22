import { Virtualizer, GridList, ListLayout } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type ScheduleEntity } from 'loot-core/types/models';

import { SchedulesListItem } from './SchedulesListItem';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { type ScheduleStatusType } from '@desktop-client/hooks/useSchedules';

type SchedulesListProps = {
  schedules: readonly ScheduleEntity[];
  isLoading: boolean;
  statuses: Map<ScheduleEntity['id'], ScheduleStatusType>;
  onSchedulePress: (schedule: ScheduleEntity) => void;
  onScheduleDelete: (schedule: ScheduleEntity) => void;
};

export function SchedulesList({
  schedules,
  isLoading,
  statuses,
  onSchedulePress,
  onScheduleDelete,
}: SchedulesListProps) {
  const { t } = useTranslation();

  if (isLoading && schedules.length === 0) {
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

  if (schedules.length === 0) {
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
          items={schedules}
          style={{
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          {schedule => (
            <SchedulesListItem
              value={schedule}
              status={statuses.get(schedule.id) || 'scheduled'}
              onAction={() => onSchedulePress(schedule)}
              onDelete={() => onScheduleDelete(schedule)}
            />
          )}
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
