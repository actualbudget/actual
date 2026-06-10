import { useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { DateTimeSelect } from '#components/select/DateTimeSelect';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ExchangeRateModalProps = Extract<
  ModalType,
  { name: 'exchange-rate' }
>['options'];

export function ExchangeRateModal({
  fromCurrency,
  toCurrency,
  date: initialDate,
  onSaved,
  onCancel,
}: ExchangeRateModalProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(initialDate);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const closeWithCancel = (close: () => void) => {
    close();
    onCancel?.();
  };

  const onSubmit = async (
    event: FormEvent<HTMLFormElement>,
    close: () => void,
  ) => {
    event.preventDefault();
    const normalizedRate = rate.trim();

    if (!/^\d+(\.\d+)?$/.test(normalizedRate) || Number(normalizedRate) <= 0) {
      setError(t('Exchange rate must be a positive number.'));
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await send('exchange-rate-create', {
        fromCurrency,
        toCurrency,
        date,
        rate: normalizedRate,
      });
      close();
      await onSaved?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('There was an error saving the exchange rate.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal name="exchange-rate">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle title={t('Missing exchange rate')} shrinkOnOverflow />
            }
            rightContent={
              <ModalCloseButton
                onPress={() => closeWithCancel(() => state.close())}
              />
            }
          />
          <Form onSubmit={event => onSubmit(event, () => state.close())}>
            <View style={{ gap: 12 }}>
              <Text>
                <Trans>
                  Add the exchange rate needed to save this transaction.
                </Trans>
              </Text>

              <InlineField label={t('From')} width="100%">
                <Input value={fromCurrency} disabled style={{ flex: 1 }} />
              </InlineField>
              <InlineField label={t('To')} width="100%">
                <Input value={toCurrency} disabled style={{ flex: 1 }} />
              </InlineField>
              <InlineField label={t('Date/time')} width="100%">
                <DateTimeSelect
                  value={date}
                  onChangeValue={setDate}
                  isRequired
                />
              </InlineField>
              <InlineField label={t('Rate')} width="100%">
                <Input
                  name="rate"
                  inputMode="decimal"
                  value={rate}
                  onChangeValue={setRate}
                  style={{ flex: 1 }}
                />
              </InlineField>
              {error && (
                <FormError style={{ color: theme.warningText }}>
                  {error}
                </FormError>
              )}
            </View>

            <ModalButtons>
              <Button onPress={() => closeWithCancel(() => state.close())}>
                <Trans>Cancel</Trans>
              </Button>
              <ButtonWithLoading
                type="submit"
                variant="primary"
                isLoading={isSaving}
                isDisabled={isSaving}
                style={{ marginLeft: 10 }}
              >
                <Trans>OK</Trans>
              </ButtonWithLoading>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
}
