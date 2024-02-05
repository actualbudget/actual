// @ts-strict-ignore
import React, { useCallback, useRef, useState } from 'react';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { type Query } from 'loot-core/src/shared/query';
import { type TransactionEntity } from 'loot-core/src/types/models';

import { type BoundActions } from '../../hooks/useActions';
import { SvgAdd } from '../../icons/v0';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Search } from '../common/Search';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

import { ROW_HEIGHT, SchedulesTable } from './SchedulesTable';

type ModalParams = {
  id: string;
  transaction: TransactionEntity;
};

export function ScheduleLink({
  modalProps,
  actions,
  transactionIds: ids,
  getTransaction,
  pushModal,
}: {
  actions: BoundActions;
  modalProps?: CommonModalProps;
  transactionIds: string[];
  getTransaction: (transactionId: string) => TransactionEntity;
  pushModal: (name: string, params: ModalParams) => void;
}) {
  const [filter, setFilter] = useState('');

  const scheduleData = useSchedules({
    transform: useCallback((q: Query) => q.filter({ completed: false }), []),
  });

  const searchInput = useRef(null);
  if (scheduleData == null) {
    return null;
  }

  const { schedules, statuses } = scheduleData;

  async function onSelect(scheduleId: string) {
    if (ids?.length > 0) {
      await send('transactions-batch-update', {
        updated: ids.map(id => ({ id, schedule: scheduleId })),
      });
    }
    actions.popModal();
  }

  async function onCreate() {
    actions.popModal();
    pushModal('schedule-edit', {
      id: null,
      transaction: getTransaction(ids[0]),
    });
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
        {ids.length === 1 && (
          <Button
            type="primary"
            style={{ marginLeft: 15, padding: '4px 10px' }}
            onClick={onCreate}
          >
            <SvgAdd style={{ width: '20', padding: '3' }} />
            Create New
          </Button>
        )}
      </View>

      <View
        style={{
          flex: `1 1 ${
            (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1)
          }px`,
          marginTop: 15,
          maxHeight: '50vh',
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
