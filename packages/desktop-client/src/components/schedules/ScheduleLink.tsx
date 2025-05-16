// @ts-strict-ignore
import React, { useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v0';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import { ROW_HEIGHT, SchedulesTable } from './SchedulesTable';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Search } from '@desktop-client/components/common/Search';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

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
