import { useEffect, useRef } from 'react';
import type { CSSProperties, Ref } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { RateField } from '#components/transactions/RateField';
import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import { useExchangeEntry } from '#hooks/useExchangeEntry';
import type { ExchangePostResult } from '#hooks/useExchangeEntry';
import type { ExchangeRequest } from '#util/exchange-entry';

export type { ExchangePostResult };

type ExchangePanelProps = {
  transaction: Pick<
    TransactionEntity,
    'amount' | 'date' | 'notes' | 'cleared' | 'category'
  >;
  register: AccountEntity;
  other: AccountEntity;
  onPost: (request: ExchangeRequest) => Promise<ExchangePostResult>;
  /** Increments to focus the first input. */
  focusToken?: number;
  onCancel?: () => void;
  cancelButtonRef?: Ref<HTMLButtonElement>;
};

// A label and its inputs stay on one line when the panel wraps.
const fieldGroup = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
} satisfies CSSProperties;

/**
 * The other account's side of an exchange transfer, entered in the register
 * next to the new transaction: its amount (or a rate that fills it in), an
 * optional fee, and the values the transfer needs to post. A foreign
 * register formats in its own currency, so the panel restores the budget
 * format: each amount is parsed at its own account's precision.
 */
export function ExchangePanel(props: ExchangePanelProps) {
  return (
    <BudgetCurrencyFormat>
      <ExchangePanelInner {...props} />
    </BudgetCurrencyFormat>
  );
}

function ExchangePanelInner({
  transaction,
  register,
  other,
  onPost,
  focusToken = 0,
  onCancel,
  cancelButtonRef,
}: ExchangePanelProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusToken > 0) firstInput.current?.focus();
  }, [focusToken]);
  const {
    payment,
    rateFrom,
    rateTo,
    currencyOf,
    otherFormat,
    otherInput,
    setOtherInput,
    rateInput,
    setRateInput,
    rateDirection,
    setRateDirection,
    feeInput,
    setFeeInput,
    feeSide,
    setFeeSide,
    category,
    setCategory,
    feeCategory,
    setFeeCategory,
    fee,
    feeAccount,
    fromRate,
    estimatedRate,
    shownRate,
    needsCategory,
    categoryOptions,
    feeCategoryOptions,
    message,
    busy,
    post: postEntry,
  } = useExchangeEntry({ transaction, register, other });
  const post = () => postEntry(onPost);

  return (
    <View
      data-testid="exchange-panel"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        padding: '6px 20px 0',
      }}
      onKeyDown={e => {
        // The panel's inputs use native tab order, outside the table's
        // cell navigation.
        if (e.key === 'Tab') {
          e.stopPropagation();
        } else if (e.key === 'Enter') {
          e.stopPropagation();
          void post();
        }
      }}
    >
      <View style={fieldGroup}>
        <Text>
          {payment ? (
            <Trans>Received in {{ account: other.name }}:</Trans>
          ) : (
            <Trans>Sent from {{ account: other.name }}:</Trans>
          )}
        </Text>
        <Input
          ref={firstInput}
          aria-label={payment ? t('Amount received') : t('Amount sent')}
          inputMode="decimal"
          style={{
            width: 110,
            ...(isNarrowWidth && { height: styles.mobileMinHeight }),
          }}
          value={otherInput}
          placeholder={
            fromRate != null ? otherFormat.forEdit(fromRate) : undefined
          }
          onChangeValue={setOtherInput}
        />
        <Text style={{ color: theme.pageTextSubdued }}>
          {currencyOf(other)}
        </Text>
      </View>
      <View style={isNarrowWidth ? { width: '100%' } : fieldGroup}>
        <Text>
          <Trans>Rate</Trans>
        </Text>
        <RateField
          name="exchange-rate"
          inputLabel={t('Exchange rate')}
          currencyCode={currencyOf(rateFrom)}
          baseCurrencyCode={currencyOf(rateTo)}
          direction={rateDirection}
          value={rateInput}
          style={{ width: 'auto' }}
          inputStyle={{
            width: '17ch',
            ...(isNarrowWidth && { height: styles.mobileMinHeight }),
          }}
          placeholder={
            shownRate != null
              ? String(Number(shownRate.toPrecision(8)))
              : (estimatedRate ?? undefined)
          }
          onChange={(value, direction) => {
            setRateInput(value);
            setRateDirection(direction);
          }}
        />
      </View>
      <View style={fieldGroup}>
        <Text>
          <Trans>Fee:</Trans>
        </Text>
        <Input
          aria-label={t('Fee')}
          inputMode="decimal"
          style={{
            width: 80,
            ...(isNarrowWidth && { height: styles.mobileMinHeight }),
          }}
          value={feeInput}
          onChangeValue={setFeeInput}
        />
        <Select
          options={[
            ['register', currencyOf(register)],
            ['other', currencyOf(other)],
          ]}
          value={feeSide}
          onChange={setFeeSide}
        />
      </View>
      {fee != null && fee !== 0 && !feeAccount.offbudget && (
        <Select
          options={feeCategoryOptions}
          value={feeCategory}
          defaultLabel={t('Fee category')}
          onChange={setFeeCategory}
        />
      )}
      {needsCategory && (
        <Select
          options={categoryOptions}
          value={category}
          defaultLabel={t('Category')}
          onChange={setCategory}
        />
      )}
      <View style={{ flex: 1 }} />
      {onCancel && (
        <Button
          ref={cancelButtonRef}
          style={{ padding: '4px 10px' }}
          onPress={onCancel}
        >
          <Trans>Cancel</Trans>
        </Button>
      )}
      <Button
        variant="primary"
        style={{ padding: '4px 10px' }}
        isDisabled={busy}
        onPress={() => void post()}
        data-testid="exchange-add-button"
      >
        <Trans>Add transfer</Trans>
      </Button>
      {message && (
        <Text
          style={{
            width: '100%',
            color: theme.errorText,
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
