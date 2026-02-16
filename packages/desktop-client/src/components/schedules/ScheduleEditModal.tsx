// @ts-strict-ignore
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';

import { send, sendCatch } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type { RecurConfig, ScheduleEntity } from 'loot-core/types/models';

import { updateScheduleConditions } from './schedule-edit-utils';
import { ScheduleEditForm } from './ScheduleEditForm';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useScheduleEdit } from '@desktop-client/hooks/useScheduleEdit';
import { useSelected } from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { getPayeesById } from '@desktop-client/payees/payeesSlice';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { useDispatch } from '@desktop-client/redux';

type ScheduleEditModalProps = Extract<
  ModalType,
  { name: 'schedule-edit' }
>['options'];

export function ScheduleEditModal({ id, transaction }: ScheduleEditModalProps) {
  const { t } = useTranslation();

  const adding = id == null;
  const fromTrans = transaction != null;
  const payees = getPayeesById(usePayees());
  const globalDispatch = useDispatch();

  // Create initial schedule if adding from transaction
  const initialSchedule = useMemo(() => {
    if (!adding) {
      return undefined;
    }

    const date = {
      start: monthUtils.currentDay(),
      frequency: 'monthly',
      patterns: [],
      skipWeekend: false,
      weekendSolveMode: 'after',
      endMode: 'never',
      endOccurrences: 1,
      endDate: monthUtils.currentDay(),
    } satisfies RecurConfig;

    const transFields = fromTrans
      ? ({
          _account: transaction.account,
          _amount: transaction.amount,
          _amountOp: 'is',
          name: transaction.payee ? payees[transaction.payee].name : '',
          _payee: transaction.payee ? transaction.payee : '',
          _date: {
            ...date,
            frequency: 'monthly',
            start: transaction.date,
            patterns: [],
          },
        } satisfies Partial<ScheduleEntity>)
      : {};

    return {
      posts_transaction: false,
      _date: date,
      _conditions: [{ op: 'isapprox', field: 'date', value: date }],
      _actions: [],
      ...transFields,
    } satisfies Partial<ScheduleEntity>;
  }, [adding, fromTrans, payees, transaction]);

  const { state, dispatch, loadSchedule } = useScheduleEdit({
    scheduleId: id,
    adding,
    initialSchedule,
    transactionId: transaction?.id,
  });

  const selectedInst = useSelected(
    'transactions',
    state.transactions,
    transaction ? [transaction.id] : [],
  );

  async function onSave(close: () => void) {
    dispatch({ type: 'form-error', error: null });
    if (!state.schedule) {
      return;
    }

    if (state.fields.name) {
      const { data: sameName } = await aqlQuery(
        q('schedules').filter({ name: state.fields.name }).select('id'),
      );
      if (sameName.length > 0 && sameName[0].id !== state.schedule.id) {
        dispatch({
          type: 'form-error',
          error: t('There is already a schedule with this name'),
        });
        return;
      }
    }

    const { error, conditions } = updateScheduleConditions(
      state.schedule,
      state.fields,
    );

    if (error) {
      dispatch({ type: 'form-error', error });
      return;
    }

    const res = await sendCatch(
      adding ? 'schedule/create' : 'schedule/update',
      {
        schedule: {
          id: state.schedule.id,
          posts_transaction: state.fields.posts_transaction,
          name: state.fields.name,
        },
        conditions,
      },
    );

    if (res.error) {
      dispatch({
        type: 'form-error',
        error: t(
          'An error occurred while saving. Please visit https://actualbudget.org/contact/ for support.',
        ),
      });
      return;
    }

    if (adding) {
      await onLinkTransactions([...selectedInst.items], res.data);
    }

    close();
  }

  async function onEditRule(id: string) {
    const rule = await send('rule-get', { id });

    if (!rule) {
      return;
    }

    globalDispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              const schedule = await loadSchedule();
              if (schedule) {
                throw new Error('Schedule found');
              }

              dispatch({ type: 'set-schedule', schedule });
            },
          },
        },
      }),
    );
  }

  async function onLinkTransactions(ids: string[], scheduleId?: string) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({
        id,
        schedule: scheduleId,
      })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  async function onUnlinkTransactions(ids: string[]) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const { schedule } = state;

  if (schedule == null) {
    return null;
  }

  function onSwitchTransactions(mode: 'linked' | 'matched') {
    dispatch({ type: 'switch-transactions', mode });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const payee =
    payees && state.fields.payee ? payees[state.fields.payee] : null;
  // This is derived from the date
  const repeats =
    state.fields.date && typeof state.fields.date !== 'string'
      ? !!state.fields.date.frequency
      : false;
  return (
    <Modal name="schedule-edit">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              payee
                ? t(`Schedule: {{name}}`, { name: payee.name })
                : t('Schedule')
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <ScheduleEditForm
            fields={state.fields}
            dispatch={dispatch}
            upcomingDates={state.upcomingDates}
            repeats={repeats}
            schedule={schedule}
            adding={adding}
            isCustom={state.isCustom ?? false}
            onEditRule={onEditRule}
            transactions={state.transactions}
            transactionsMode={state.transactionsMode}
            error={state.error}
            selectedInst={selectedInst}
            onSwitchTransactions={onSwitchTransactions}
            onLinkTransactions={onLinkTransactions}
            onUnlinkTransactions={onUnlinkTransactions}
          />

          <SpaceBetween
            style={{
              marginTop: 20,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Button onPress={close}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" onPress={() => onSave(close)}>
              {adding ? t('Add') : t('Save')}
            </Button>
          </SpaceBetween>
        </>
      )}
    </Modal>
  );
}
