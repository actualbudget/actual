import { useEffect, useEffectEvent, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import { useExchangeEntry } from '#hooks/useExchangeEntry';
import type {
  ExchangeEntryInitial,
  ExchangePostResult,
} from '#hooks/useExchangeEntry';
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
  /** A fee requires the other amount (scheduled completion). */
  feeNeedsOtherAmount?: boolean;
  /** Increments to focus the first input. */
  focusToken?: number;
  /** An existing exchange being edited. */
  initial?: ExchangeEntryInitial;
  submitLabel?: string;
  /** Reports the request Save would send, whenever it changes. */
  onRequestChange?: (request: ExchangeRequest | null) => void;
  /** Holds Save, for example while a budget notice loads. */
  submitDisabled?: boolean;
  /** Fields shown before the other account's side, such as an edit's own. */
  leading?: ReactNode;
  /** Shows a Cancel button. */
  onCancel?: () => void;
};

// A label and its inputs stay on one line when the panel wraps.
export const fieldGroup = {
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
  feeNeedsOtherAmount,
  initial,
  submitLabel,
  onRequestChange,
  submitDisabled = false,
  leading,
  onCancel,
}: ExchangePanelProps) {
  const { t } = useTranslation();
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusToken > 0) firstInput.current?.focus();
  }, [focusToken]);
  const {
    payment,
    source,
    destination,
    currencyOf,
    otherFormat,
    otherInput,
    setOtherInput,
    rateInput,
    setRateInput,
    feeInput,
    setFeeInput,
    feeSide,
    setFeeSide,
    baseInput,
    setBaseInput,
    category,
    setCategory,
    feeCategory,
    setFeeCategory,
    fee,
    feeAccount,
    fromRate,
    estimatedRate,
    shownRate,
    bothForeign,
    baseEstimate,
    baseFormat,
    needsCategory,
    categoryOptions,
    feeCategoryOptions,
    defaultCurrency,
    message,
    estimateMessage,
    busy,
    post: postEntry,
    request,
  } = useExchangeEntry({
    transaction,
    register,
    other,
    feeNeedsOtherAmount,
    initial,
  });
  const post = () => (submitDisabled ? undefined : postEntry(onPost));
  const requestKey = JSON.stringify(request);
  // Reports only when the request itself changes.
  const reportRequest = useEffectEvent((key: string) => {
    onRequestChange?.(JSON.parse(key) as ExchangeRequest | null);
  });
  useEffect(() => {
    reportRequest(requestKey);
  }, [requestKey]);

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
        } else if (e.key === 'Escape' && onCancel) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      {leading}
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
          style={{ width: 110 }}
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
      <View style={fieldGroup}>
        <Text>
          <Trans>Rate: 1 {{ source: currencyOf(source) }} =</Trans>
        </Text>
        <Input
          aria-label={t('Exchange rate')}
          inputMode="decimal"
          style={{ width: 90 }}
          value={rateInput}
          placeholder={
            shownRate != null
              ? String(Number(shownRate.toPrecision(8)))
              : (estimatedRate ?? undefined)
          }
          onChangeValue={setRateInput}
        />
        <Text style={{ color: theme.pageTextSubdued }}>
          {currencyOf(destination)}
        </Text>
      </View>
      <View style={fieldGroup}>
        <Text>
          <Trans>Fee:</Trans>
        </Text>
        <Input
          aria-label={t('Fee')}
          inputMode="decimal"
          style={{ width: 80 }}
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
      {bothForeign && (
        <View style={fieldGroup}>
          <Text>
            <Trans>Value in {{ base: defaultCurrency }}:</Trans>
          </Text>
          <Input
            aria-label={t('Value in budget currency')}
            inputMode="decimal"
            style={{ width: 100 }}
            value={baseInput}
            placeholder={
              baseEstimate != null
                ? baseFormat.forEdit(baseEstimate)
                : undefined
            }
            onChangeValue={setBaseInput}
          />
        </View>
      )}
      <View style={{ flex: 1 }} />
      {onCancel && (
        <Button style={{ padding: '4px 10px' }} onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      )}
      <Button
        variant="primary"
        style={{ padding: '4px 10px' }}
        isDisabled={busy || submitDisabled}
        onPress={() => void post()}
        data-testid="exchange-add-button"
      >
        {submitLabel ?? <Trans>Add transfer</Trans>}
      </Button>
      {(message || estimateMessage) && (
        <Text
          style={{
            width: '100%',
            color: message ? theme.errorText : theme.pageTextSubdued,
          }}
        >
          {message ?? estimateMessage}
        </Text>
      )}
    </View>
  );
}
