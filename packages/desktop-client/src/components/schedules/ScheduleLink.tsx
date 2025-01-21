// @ts-strict-ignore
import React, { useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  type Modal as ModalType,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { q } from 'loot-core/src/shared/query';

import { SvgAdd } from '../../icons/v0';
import { useDispatch } from '../../redux';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Search } from '../common/Search';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { ROW_HEIGHT, SchedulesTable } from './SchedulesTable';

type ScheduleLinkProps = Extract<
  ModalType,
  { name: 'schedule-link' }
>['options'];

export function ScheduleLink({
  transactionIds: ids,
  getTransaction,
  accountName,
  onScheduleLinked,
}: ScheduleLinkProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [filter, setFilter] = useState(accountName || '');
  const schedulesQuery = useMemo(
    () => q('schedules').filter({ completed: false }).select('*'),
    [],
  );
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ query: schedulesQuery });

  const searchInput = useRef(null);

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
      pushModal({
        modal: {
          name: 'schedule-edit',
          options: {
            id: null,
            transaction: getTransaction(ids[0]),
          },
        },
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
            title={t('Link schedule')}
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
              isLoading={isSchedulesLoading}
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
