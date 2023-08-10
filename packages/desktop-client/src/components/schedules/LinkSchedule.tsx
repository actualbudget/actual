import React, { useCallback, useRef, useState } from 'react';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';

import { type BoundActions } from '../../hooks/useActions';
import Modal from '../common/Modal';
import Search from '../common/Search';
import Text from '../common/Text';
import View from '../common/View';
import { type CommonModalProps } from '../Modals';

import { ROW_HEIGHT, SchedulesTable } from './SchedulesTable';

export default function ScheduleLink({
  modalProps,
  actions,
  transactionIds: ids,
}: {
  actions: BoundActions;
  modalProps?: CommonModalProps;
  transactionIds: string[];
}) {
  let [filter, setFilter] = useState('');

  let scheduleData = useSchedules({
    transform: useCallback((q: any) => q.filter({ completed: false }), []),
  });

  let searchInput = useRef(null);
  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  async function onSelect(scheduleId: string) {
    if (ids?.length > 0) {
      await send('transactions-batch-update', {
        updated: ids.map(id => ({ id, schedule: scheduleId })),
      });
    }
    actions.popModal();
  }

  return (
    <Modal title="Link Schedule" size={{ width: 600 }} {...modalProps}>
      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <Text>
          Choose the schedule{' '}
          {ids?.length > 1
            ? `these ${ids.length} transactions belong`
            : `this transaction belongs`}{' '}
          to:
        </Text>
        <Search
          inputRef={searchInput}
          isInModal
          width={300}
          placeholder="Filter schedules…"
          value={filter}
          onChange={setFilter}
        />
      </View>

      <View
        style={{
          marginTop: 15,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1),
          overflow: 'hidden',
        }}
      >
        <SchedulesTable
          allowCompleted={false}
          filter={filter}
          minimal={true}
          onAction={() => {}}
          onSelect={onSelect}
          schedules={schedules}
          statuses={statuses}
          style={null}
          tableStyle={{ marginInline: -20 }}
        />
      </View>
    </Modal>
  );
}
