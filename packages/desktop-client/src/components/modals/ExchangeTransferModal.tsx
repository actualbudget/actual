import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { format as monthUtilFormat } from '@actual-app/core/shared/months';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { ExchangeEdit } from '#components/transactions/ExchangeEdit';
import { ExchangePanel } from '#components/transactions/ExchangePanel';
import type { ExchangePostResult } from '#components/transactions/ExchangePanel';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useAccounts } from '#hooks/useAccounts';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { ExchangeRequest } from '#util/exchange-entry';

type ExchangeTransferModalProps = Extract<
  ModalType,
  { name: 'exchange-transfer' }
>['options'];

type Occurrence = NonNullable<ExchangeTransferModalProps['occurrence']>;

function ScheduleAmount({ amount }: { amount: number }) {
  const format = useFormat();
  return <Text>{format(amount, 'financial')}</Text>;
}

/**
 * Completes a scheduled exchange occurrence that has no estimate, or edits
 * an existing exchange transfer where the register cannot edit it inline.
 */
export function ExchangeTransferModal(props: ExchangeTransferModalProps) {
  const { t } = useTranslation();
  return (
    <Modal name="exchange-transfer" containerProps={{ style: { width: 640 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={
              props.edit ? t('Edit transfer') : t('Post scheduled transfer')
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {props.edit ? (
            <View style={{ paddingBottom: 10 }}>
              <ExchangeEdit
                id={props.edit.id}
                onSaved={props.edit.onSaved}
                onDone={() => state.close()}
              />
            </View>
          ) : (
            <ScheduledExchange occurrence={props.occurrence} />
          )}
        </>
      )}
    </Modal>
  );
}

/**
 * The schedule's own amount is fixed, and the other account's side is
 * entered as in the register.
 */
function ScheduledExchange({ occurrence }: { occurrence: Occurrence }) {
  const dispatch = useDispatch();
  const { data: accounts = [] } = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const date = monthUtilFormat(occurrence.date, dateFormat);
  const register = accounts.find(a => a.id === occurrence.account);
  const other = accounts.find(a => a.id === occurrence.other);

  const transaction = {
    date: occurrence.date,
    amount: occurrence.amount,
    notes: occurrence.notes ?? undefined,
    cleared: occurrence.cleared,
    category: occurrence.category ?? undefined,
  };

  const onPost = async (
    request: ExchangeRequest,
  ): Promise<ExchangePostResult> => {
    try {
      const result = await send('transactions/post-exchange-transfer', {
        ...request,
        schedule: occurrence.schedule,
      });
      if (result.status !== 'ok') {
        return { status: 'rate-unavailable', currencies: result.currencies };
      }
      dispatch(removeModal({ name: 'exchange-transfer' }));
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  return register && other ? (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <Text>
        <Trans>
          {{ account: register.name }} on {{ date }}:
        </Trans>{' '}
        {register.currency ? (
          <CurrencyFormatProvider
            currencyCode={register.currency}
            precision={register.currency_precision ?? 0}
          >
            <ScheduleAmount amount={occurrence.amount} />
          </CurrencyFormatProvider>
        ) : (
          <ScheduleAmount amount={occurrence.amount} />
        )}
      </Text>
      <ExchangePanel
        transaction={transaction}
        register={register}
        other={other}
        onPost={onPost}
        feeNeedsOtherAmount
      />
    </View>
  ) : (
    <Text>
      <Trans>The accounts of this schedule were not found.</Trans>
    </Text>
  );
}
