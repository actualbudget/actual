import { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { BaseLaneMonth } from '@actual-app/core/server/budget/base-slots';
import * as monthUtils from '@actual-app/core/shared/months';
import { useQuery } from '@tanstack/react-query';

import { Amount } from '#components/budget/pocketDisplay';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import { useLocale } from '#hooks/useLocale';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';

import { ActionForm, AmountField, useStatusMessage } from './PocketActions';
import { ChooseOwnerForm, MergeButton } from './PocketRepairs';

type BaseSlotModalProps = Extract<ModalType, { name: 'base-slot' }>['options'];

/**
 * A category's base slot on desktop and mobile (MC-10.6): every base lane
 * it shows in a month (own, inherited, duplicate, orphan or unresolved)
 * and their repairs. Amounts are integers in the budget encoding.
 */
export function BaseSlotModal({ categoryId, month }: BaseSlotModalProps) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  return (
    <MobileSheet
      name="base-slot"
      title={t('{{category}}: base budget', {
        category: category?.name ?? '',
      })}
    >
      {({ close }) => (
        <BaseSlotDetails
          categoryId={categoryId}
          initialMonth={month}
          onDone={close}
        />
      )}
    </MobileSheet>
  );
}

function BaseSlotDetails({
  categoryId,
  initialMonth,
  onDone,
}: {
  categoryId: string;
  initialMonth: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [budgetId] = useMetadataPref('id');
  const [month, setMonth] = useState(initialMonth);
  const { data: categories } = useCategories();
  const { data } = useQuery({
    // Under the pocket reads' key, so the same changes refresh it.
    queryKey: [
      'budget',
      'category-pockets',
      'base-lanes',
      budgetId,
      categoryId,
      month,
    ],
    queryFn: () =>
      send('budget/base-slot-lanes', { month, category: categoryId }),
    // A local read: it runs offline like the other pocket reads.
    networkMode: 'always',
  });
  const name = (id: string) =>
    categories?.list.find(c => c.id === id)?.name ?? t('Deleted category');
  const statuses = {
    live: null,
    retired: null,
    duplicate: t('Duplicate'),
    orphan: t('Orphan'),
    unresolved: t('Unresolved owner'),
  };

  return (
    <View style={{ padding: `0 ${spacing.lg}px`, gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="bare"
          onPress={() => setMonth(monthUtils.prevMonth(month))}
        >
          <Trans>Previous month</Trans>
        </Button>
        <Text style={{ fontWeight: 600 }}>
          {monthUtils.format(month, 'MMMM yyyy', locale)}
        </Text>
        <Button
          variant="bare"
          onPress={() => setMonth(monthUtils.nextMonth(month))}
        >
          <Trans>Next month</Trans>
        </Button>
      </View>
      {data && (
        <ul aria-label={t('Base budget lanes')} style={lanesStyle}>
          {data.lanes.map(lane => (
            <li key={lane.laneId} style={sectionStyle}>
              <Text style={{ fontWeight: 600 }}>
                {name(lane.originCategoryId)}
              </Text>
              <Text>
                {lane.kind === 'own' ? t('Own lane') : t('Inherited')}
              </Text>
              {statuses[lane.status] && <Text>{statuses[lane.status]}</Text>}
              <dl style={listStyle}>
                <Row label={t('Budgeted')}>
                  <Amount value={lane.budgeted} />
                </Row>
                <Row label={t('Spent')}>
                  <Amount value={lane.spent} />
                </Row>
                <Row label={t('Balance')}>
                  <Amount value={lane.balance} />
                </Row>
              </dl>
              {lane.carryover && (
                <Text>
                  <Trans>Rollover overspending</Trans>
                </Text>
              )}
              <BaseLaneRepair
                lane={lane}
                slotId={data.slotId}
                month={month}
                category={name(lane.originCategoryId)}
                onDone={onDone}
              />
            </li>
          ))}
        </ul>
      )}
    </View>
  );
}

function BaseLaneRepair({
  lane,
  slotId,
  month,
  category,
  onDone,
}: {
  lane: BaseLaneMonth;
  slotId: string | null;
  month: string;
  category: string;
  onDone: () => void;
}) {
  if (lane.status === 'duplicate' || lane.status === 'orphan') {
    return <MergeButton laneId={lane.laneId} onDone={onDone} />;
  }
  if (lane.status === 'unresolved') {
    return (
      <ChooseOwnerForm
        laneId={lane.laneId}
        category={category}
        onDone={onDone}
      />
    );
  }
  if (lane.kind === 'own' || !slotId) return null;
  return (
    <MoveForm
      slotId={slotId}
      laneId={lane.laneId}
      month={month}
      category={category}
      onDone={onDone}
    />
  );
}

/** Move inherited balance: a budget-currency integer into the own lane. */
function MoveForm({
  slotId,
  laneId,
  month,
  category,
  onDone,
}: {
  slotId: string;
  laneId: string;
  month: string;
  category: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const message = useStatusMessage();
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <ActionForm
      name={t('Move from {{category}}', { category })}
      error={error}
      onSubmit={async () => {
        if (amount === null) return;
        const result = await send('budget/pocket-move-inherited', {
          month,
          slotId,
          laneId,
          amount,
        });
        const text = message(result);
        if (text) setError(text);
        else onDone();
      }}
    >
      <AmountField
        label={t('Amount ({{currency}})', { currency: budgetCurrency })}
        onChange={setAmount}
      />
      <Button type="submit" isDisabled={amount === null}>
        <Trans>Move to this slot</Trans>
      </Button>
    </ActionForm>
  );
}

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  borderTop: `1px solid ${theme.tableBorder}`,
  paddingTop: spacing.sm,
} as const;

const listStyle = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
} as const;

const lanesStyle = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <dt>{label}</dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </View>
  );
}
