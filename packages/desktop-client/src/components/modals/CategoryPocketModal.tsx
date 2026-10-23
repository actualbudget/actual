import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { PocketMonth } from '@actual-app/core/server/budget/pocket-readers';
import type {
  PocketIncompleteReason,
  PocketValuation,
} from '@actual-app/core/server/budget/reservations';

import { Amount, NativeAmount } from '#components/budget/pocketDisplay';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import {
  useCategoryPockets,
  usePocketBacking,
} from '#hooks/useCategoryPockets';
import type { PocketBacking } from '#hooks/useCategoryPockets';
import type { Modal as ModalType } from '#modals/modalsSlice';

import { PocketActions } from './PocketActions';

type CategoryPocketModalProps = Extract<
  ModalType,
  { name: 'category-pocket' }
>['options'];

/**
 * A currency slot's month on desktop and mobile: its native and valued
 * figures, valuation and backing, every lane it shows (own, inherited,
 * duplicate, orphan or unresolved) and its actions.
 */
export function CategoryPocketModal({
  categoryId,
  pocketId,
  month,
}: CategoryPocketModalProps) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const pocket = useCategoryPockets(month)
    .get(categoryId)
    ?.pockets.find(p => p.id === pocketId);
  const backing = usePocketBacking(month).get(pocket?.currency ?? '');

  return (
    <MobileSheet
      name="category-pocket"
      title={t('{{category}}: {{currency}}', {
        category: category?.name ?? '',
        currency: pocket?.currency ?? '',
      })}
      isLoading={!pocket}
    >
      {({ close }) =>
        pocket && (
          <>
            <PocketDetails pocket={pocket} backing={backing} />
            <View style={{ padding: `0 ${spacing.lg}px` }}>
              <PocketActions
                pocket={pocket}
                categoryId={categoryId}
                month={month}
                onDone={close}
              />
            </View>
            <MobileSheetSection>
              <MobileSheetRow
                label={pocket.hidden ? t('Show currency') : t('Hide currency')}
                onPress={async () => {
                  await send('budget/slot-meta-set', {
                    id: pocket.id,
                    hidden: !pocket.hidden,
                  });
                  close();
                }}
              />
            </MobileSheetSection>
          </>
        )
      }
    </MobileSheet>
  );
}

function PocketDetails({
  pocket,
  backing,
}: {
  pocket: PocketMonth;
  backing?: PocketBacking;
}) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const reasons = useReasonLabels();
  const valuations = {
    market: t('Market rate'),
    unreserved: t('Nothing reserved'),
    'included-rate': t('Valued at included rate'),
    'last-unit-value': t('Valued at last unit value'),
    unvalued: t('Unvalued'),
    'unknown-native': t('Unknown amount'),
  } satisfies Record<PocketValuation, string>;
  const statuses = {
    live: null,
    retired: null,
    duplicate: t('Duplicate'),
    orphan: t('Orphan'),
    unresolved: t('Unresolved owner'),
  };
  const { currency, precision } = pocket;
  const native = (value: number | null) => (
    <NativeAmount value={value} currency={currency} precision={precision} />
  );
  const name = (id: string) =>
    categories?.list.find(c => c.id === id)?.name ?? t('Deleted category');

  return (
    <View style={{ padding: `0 ${spacing.lg}px`, gap: spacing.md }}>
      <section
        aria-label={t('{{currency}} slot', { currency })}
        style={sectionStyle}
      >
        <dl style={listStyle}>
          <Row label={t('Budgeted')}>{native(pocket.budgeted)}</Row>
          <Row label={t('Spent')}>{native(pocket.spent)}</Row>
          <Row label={t('Balance')}>{native(pocket.balance)}</Row>
          <Row label={t('Value')}>
            <Amount value={pocket.balanceBase} />
          </Row>
          <Row label={t('Assigned in the budget currency')}>
            <Amount value={pocket.budgetedBase} />
          </Row>
          <Row label={t('FX contribution')}>
            <Amount value={pocket.fxContribution} />
          </Row>
        </dl>
        <Text>{valuations[pocket.valuation]}</Text>
        {pocket.rate && (
          <Text>
            {t('Rate on {{date}}: {{rate}}', {
              date: pocket.valuationDate,
              rate: pocket.rate.rate,
            })}
          </Text>
        )}
        {pocket.incomplete.map(reason => (
          <Text key={reason}>{reasons[reason]}</Text>
        ))}
      </section>

      {backing && (
        <section
          aria-label={t('{{currency}} backing', { currency })}
          style={sectionStyle}
        >
          <dl style={listStyle}>
            {/* Backing is currency wide, at the explanation's own scale. */}
            <Row label={t('Reserved')}>
              <NativeAmount
                value={backing.reserved}
                currency={currency}
                precision={backing.precision}
              />
            </Row>
            <Row label={t('Held')}>
              <NativeAmount
                value={backing.held}
                currency={currency}
                precision={backing.precision}
              />
            </Row>
          </dl>
          {backing.shortage && (
            <Text style={{ color: theme.warningText }}>
              <Trans>Reserved, not held</Trans>
            </Text>
          )}
        </section>
      )}

      <details>
        <summary>
          <Trans count={pocket.lanes.length}>
            Lanes ({{ count: pocket.lanes.length }})
          </Trans>
        </summary>
        <ul aria-label={t('Budget lanes')} style={lanesStyle}>
          {pocket.lanes.map(lane => (
            <li key={lane.laneId} style={sectionStyle}>
              <Text style={{ fontWeight: 600 }}>
                {name(lane.originCategoryId)}
              </Text>
              <Text>
                {lane.kind === 'own' ? t('Own lane') : t('Inherited')}
              </Text>
              {statuses[lane.status] && <Text>{statuses[lane.status]}</Text>}
              <dl style={listStyle}>
                <Row label={t('Budgeted')}>{native(lane.budgeted)}</Row>
                <Row label={t('Spent')}>{native(lane.spent)}</Row>
                <Row label={t('Balance')}>{native(lane.balance)}</Row>
                <Row label={t('Value')}>
                  {lane.valueKind === 'unknown' ? (
                    <Trans>Value unavailable</Trans>
                  ) : (
                    <Amount value={lane.balanceBase} />
                  )}
                </Row>
              </dl>
              {lane.budgetedBase === null && lane.captureDate && (
                <Text>
                  {t('Pending since {{date}}', { date: lane.captureDate })}
                </Text>
              )}
              {lane.carryover && (
                <Text>
                  <Trans>Rollover overspending</Trans>
                </Text>
              )}
            </li>
          ))}
        </ul>
      </details>
    </View>
  );
}

function useReasonLabels() {
  const { t } = useTranslation();
  return {
    'rate-unavailable': t('No exchange rate is available for this date.'),
    'fx-excluded': t('Some FX changes were left out of To Budget.'),
    'reservation-unvalued': t('This reservation could not be valued.'),
    'reservation-incomplete': t(
      'Part of this reservation is not yet included in To Budget.',
    ),
    'entry-pending': t(
      'Some assignments have no frozen budget-currency amount yet.',
    ),
    'precision-unavailable': t('Recorded currency precision is unavailable.'),
    'pair-encoding-mismatch': t(
      'An assignment is recorded in another currency.',
    ),
    'amount-out-of-range': t('An amount exceeds supported bounds.'),
    'owner-unresolved': t('A lane in this slot has no resolved owner.'),
  } satisfies Record<PocketIncompleteReason, string>;
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
