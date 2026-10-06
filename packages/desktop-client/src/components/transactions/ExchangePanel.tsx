import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
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
  /** A fee requires the other amount (scheduled completion). */
  feeNeedsOtherAmount?: boolean;
  /** Increments to focus the first input. */
  focusToken?: number;
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
  feeNeedsOtherAmount,
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
  } = useExchangeEntry({
    transaction,
    register,
    other,
    feeNeedsOtherAmount,
  });
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
      <Button
        variant="primary"
        style={{ padding: '4px 10px' }}
        isDisabled={busy}
        onPress={() => void post()}
        data-testid="exchange-add-button"
      >
        <Trans>Add transfer</Trans>
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
