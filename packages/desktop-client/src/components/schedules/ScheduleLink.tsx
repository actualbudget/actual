// @ts-strict-ignore
import React, { useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { type Query } from 'loot-core/src/shared/query';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/src/types/models';

import { SvgAdd } from '../../icons/v0';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Search } from '../common/Search';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { ROW_HEIGHT, SchedulesTable } from './SchedulesTable';

export function ScheduleLink({
  transactionIds: ids,
  getTransaction,
  accountName,
  onScheduleLinked,
}: {
  transactionIds: string[];
  getTransaction: (transactionId: string) => TransactionEntity;
  accountName?: string;
  onScheduleLinked?: (schedule: ScheduleEntity) => void;
}) {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [filter, setFilter] = useState(accountName || '');

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
      onScheduleLinked?.(schedules.find(s => s.id === scheduleId));
    }
  }

  async function onCreate() {
    dispatch(
      pushModal('schedule-edit', {
        id: null,
        transaction: getTransaction(ids[0]),
      }),
    );
  }

  return (
    <Modal
      name="schedule-link"
      containerProps={{
        style: {
          width: 800,
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Link Schedule')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'row',
              gap: 4,
              marginBottom: 20,
              alignItems: 'center',
            }}
          >
            <Text>
              {t(
                'Choose the schedule these {{ count }} transactions belong to:',
                { count: ids?.length ?? 0 },
              )}
            </Text>
            <InitialFocus>
              <Search
                inputRef={searchInput}
                isInModal
                width={300}
                placeholder={t('Filter schedules…')}
                value={filter}
                onChange={setFilter}
              />
            </InitialFocus>
            {ids.length === 1 && (
              <Button
                variant="primary"
                style={{ marginLeft: 15, padding: '4px 10px' }}
                onPress={() => {
                  close();
                  onCreate();
                }}
              >
                <SvgAdd style={{ width: '20', padding: '3' }} />
                <Trans>Create New</Trans>
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
              onSelect={id => {
                onSelect(id);
                close();
              }}
              schedules={schedules}
              statuses={statuses}
              style={null}
            />
          </View>
        </>
      )}
    </Modal>
  );
}
