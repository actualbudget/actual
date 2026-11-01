import { useImperativeHandle } from 'react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { FieldLabel, InputField } from '#components/mobile/MobileForms';
import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import { useExchangeEntry } from '#hooks/useExchangeEntry';
import type { ExchangePostResult } from '#hooks/useExchangeEntry';
import type { ExchangeRequest } from '#util/exchange-entry';

export type ExchangeFieldsHandle = {
  /** Posts the transfer; resolves true once it is saved. */
  post: () => Promise<boolean>;
};

type ExchangeFieldsProps = {
  ref?: Ref<ExchangeFieldsHandle>;
  transaction: Pick<
    TransactionEntity,
    'amount' | 'date' | 'notes' | 'cleared' | 'category'
  >;
  register: AccountEntity;
  other: AccountEntity;
  onPost: (request: ExchangeRequest) => Promise<ExchangePostResult>;
};

/**
 * The other side of an exchange transfer in the mobile transaction form,
 * outside any foreign account's format so budget amounts keep their scale.
 */
export function ExchangeFields(props: ExchangeFieldsProps) {
  return (
    <BudgetCurrencyFormat>
      <ExchangeFieldsInner {...props} />
    </BudgetCurrencyFormat>
  );
}

function ExchangeFieldsInner({
  ref,
  transaction,
  register,
  other,
  onPost,
}: ExchangeFieldsProps) {
  const { t } = useTranslation();
  const entry = useExchangeEntry({ transaction, register, other });
  useImperativeHandle(ref, () => ({ post: () => entry.post(onPost) }));

  return (
    <View data-testid="exchange-fields">
      <FieldLabel
        title={
          entry.payment
            ? t('Received in {{account}} ({{currency}})', {
                account: other.name,
                currency: entry.currencyOf(other),
              })
            : t('Sent from {{account}} ({{currency}})', {
                account: other.name,
                currency: entry.currencyOf(other),
              })
        }
      />
      <InputField
        inputMode="decimal"
        aria-label={entry.payment ? t('Amount received') : t('Amount sent')}
        value={entry.otherInput}
        placeholder={
          entry.fromRate != null
            ? entry.otherFormat.forEdit(entry.fromRate)
            : undefined
        }
        onChangeValue={entry.setOtherInput}
      />
      <FieldLabel
        title={t('Rate: 1 {{source}} = … {{destination}}', {
          source: entry.currencyOf(entry.source),
          destination: entry.currencyOf(entry.destination),
        })}
      />
      <InputField
        inputMode="decimal"
        aria-label={t('Exchange rate')}
        value={entry.rateInput}
        placeholder={
          entry.shownRate != null
            ? String(Number(entry.shownRate.toPrecision(8)))
            : (entry.estimatedRate ?? undefined)
        }
        onChangeValue={entry.setRateInput}
      />
      <FieldLabel title={t('Fee')} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <InputField
            inputMode="decimal"
            aria-label={t('Fee')}
            value={entry.feeInput}
            onChangeValue={entry.setFeeInput}
          />
        </View>
        <Select
          options={[
            ['register', entry.currencyOf(register)],
            ['other', entry.currencyOf(other)],
          ]}
          value={entry.feeSide}
          onChange={entry.setFeeSide}
        />
      </View>
      {entry.fee != null && entry.fee !== 0 && !entry.feeAccount.offbudget && (
        <>
          <FieldLabel title={t('Fee category')} />
          <Select
            options={entry.feeCategoryOptions}
            value={entry.feeCategory}
            defaultLabel={t('Fee category')}
            onChange={entry.setFeeCategory}
          />
        </>
      )}
      {entry.needsCategory && (
        <>
          <FieldLabel title={t('Category')} />
          <Select
            options={entry.categoryOptions}
            value={entry.category}
            defaultLabel={t('Category')}
            onChange={entry.setCategory}
          />
        </>
      )}
      {entry.bothForeign && (
        <>
          <FieldLabel
            title={t('Value in {{base}}', { base: entry.defaultCurrency })}
          />
          <InputField
            inputMode="decimal"
            aria-label={t('Value in budget currency')}
            value={entry.baseInput}
            placeholder={
              entry.baseEstimate != null
                ? entry.baseFormat.forEdit(entry.baseEstimate)
                : undefined
            }
            onChangeValue={entry.setBaseInput}
          />
        </>
      )}
      {(entry.message || entry.estimateMessage) && (
        <Text
          style={{
            margin: '8px 0',
            color: entry.message ? theme.errorText : theme.pageTextSubdued,
          }}
        >
          {entry.message ?? entry.estimateMessage}
        </Text>
      )}
    </View>
  );
}
