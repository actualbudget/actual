import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import { css } from '@emotion/css';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

export function ForecastOccurrenceForm({
  schedule,
}: {
  schedule: ScheduleEntity;
}) {
  const { t } = useTranslation();
  const id = useId();
  const format = useFormat();
  const isPrivate = usePrivacyMode();
  const client = useQueryClient();
  const [dueDate, setDueDate] = useState(schedule.next_date ?? '');
  const [transactionId, setTransactionId] = useState('');
  const options = useQuery({
    queryKey: ['schedule-occurrences', schedule.id],
    queryFn: () =>
      send('schedule/get-occurrence-options', { scheduleId: schedule.id }),
  });
  const record = options.data?.records.find(
    record => record.dueDate === dueDate,
  );
  const mutation = useMutation({
    mutationFn: (
      resolution:
        | { status: 'skipped' }
        | { status: 'paid'; transactionId: string }
        | null,
    ) =>
      send('schedule/set-occurrence', {
        scheduleId: schedule.id,
        dueDate,
        resolution,
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['schedule-occurrences', schedule.id],
        }),
        client.invalidateQueries({ queryKey: ['balance-forecast-series'] }),
      ]);
    },
  });
  const onSync = useEffectEvent((event: ServerEvents['sync-event']) => {
    if (
      (event.type === 'applied' || event.type === 'success') &&
      event.tables.some(table =>
        ['schedule_occurrences', 'transactions'].includes(table),
      )
    ) {
      void options.refetch();
    }
  });
  const onUndo = useEffectEvent((event: ServerEvents['undo-event']) => {
    if (
      event.tables.some(table =>
        ['schedule_occurrences', 'transactions'].includes(table),
      )
    ) {
      mutation.reset();
      void options.refetch();
    }
  });
  useEffect(() => {
    const unlistenSync = listen('sync-event', onSync);
    const unlistenUndo = listen('undo-event', onUndo);
    return () => {
      unlistenSync();
      unlistenUndo();
    };
  }, []);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ gap: 5, flex: '1 1 180px', maxWidth: 220 }}>
          <label htmlFor={`${id}-date`}>
            <Trans>Occurrence due date</Trans>
          </label>
          <Input
            id={`${id}-date`}
            type="date"
            className={css({
              colorScheme: 'light dark',
              '[data-theme="light"] &': { colorScheme: 'light' },
              '[data-theme="dark"] &, [data-theme="midnight"] &': {
                colorScheme: 'dark',
              },
            })}
            value={dueDate}
            disabled={mutation.isPending}
            onChange={event => {
              setDueDate(event.target.value);
              mutation.reset();
            }}
          />
        </View>
        <View style={{ gap: 5, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-payment`}>
            <Trans>Linked payment</Trans>
          </label>
          <Select
            id={`${id}-payment`}
            value={transactionId}
            defaultLabel={t('Choose a payment')}
            onChange={value => {
              setTransactionId(value);
              mutation.reset();
            }}
            disabled={options.isPending || mutation.isPending}
            style={styles.tnum}
            options={(options.data?.payments ?? []).map(payment => [
              payment.transactionId,
              t('{{date}} · {{amount}}', {
                date: payment.date,
                amount: isPrivate
                  ? '••••'
                  : format(payment.amount, 'financial'),
              }),
            ])}
          />
        </View>
      </View>
      {options.isError ? (
        <div role="alert">
          <Trans>Could not load linked payments.</Trans>{' '}
          <Button variant="bare" onPress={() => void options.refetch()}>
            <Trans>Retry</Trans>
          </Button>
        </div>
      ) : (
        <>
          <div>
            {record?.status === 'skipped' ? (
              <Trans>Recorded as skipped.</Trans>
            ) : record?.status === 'paid' ? (
              <Trans>
                Recorded as paid. The payment must remain linked to count.
              </Trans>
            ) : (
              <Trans>No record for this date. Matching will be inferred.</Trans>
            )}
          </div>
          {(options.data?.records.length ?? 0) > 0 && (
            <View style={{ gap: 5, maxWidth: 320 }}>
              <label htmlFor={`${id}-records`}>
                <Trans>Recorded occurrences</Trans>
              </label>
              <Select
                id={`${id}-records`}
                value={dueDate}
                defaultLabel={t('Choose a recorded occurrence')}
                onChange={value => {
                  setDueDate(value);
                  mutation.reset();
                }}
                disabled={mutation.isPending}
                options={(options.data?.records ?? []).map(record => [
                  record.dueDate,
                  record.status === 'paid'
                    ? t('{{date}}: paid', { date: record.dueDate })
                    : t('{{date}}: skipped', { date: record.dueDate }),
                ])}
              />
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              isDisabled={
                !dueDate ||
                !transactionId ||
                mutation.isPending ||
                options.isPending
              }
              onPress={() => mutation.mutate({ status: 'paid', transactionId })}
            >
              <Trans>Record payment</Trans>
            </Button>
            <Button
              isDisabled={!dueDate || mutation.isPending || options.isPending}
              onPress={() => mutation.mutate({ status: 'skipped' })}
            >
              <Trans>Record as skipped</Trans>
            </Button>
            <Button
              isDisabled={!record || mutation.isPending}
              onPress={() => mutation.mutate(null)}
            >
              <Trans>Clear record</Trans>
            </Button>
          </View>
          <div style={{ color: theme.pageTextLight }}>
            <Trans>
              Shows up to 100 recent linked payments. A payment can belong to
              one occurrence.
            </Trans>
          </div>
        </>
      )}
      {mutation.isPending && (
        <div role="status">
          <Trans>Saving occurrence…</Trans>
        </div>
      )}
      {mutation.isSuccess && (
        <div role="status">
          <Trans>Occurrence saved.</Trans>
        </div>
      )}
      {mutation.isError && (
        <div role="alert" style={{ color: theme.errorText }}>
          {mutation.error.message}
        </div>
      )}
    </View>
  );
}
