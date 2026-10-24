import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  PocketWriteResult,
  RequestAmount,
} from '@actual-app/core/server/budget/pocket-flows';
import type {
  PocketLaneMonth,
  PocketMonth,
} from '@actual-app/core/server/budget/pocket-readers';

import { useCategories } from '#hooks/useCategories';

import {
  ActionForm,
  AmountField,
  requestAmount,
  SelectField,
  useStatusMessage,
} from './PocketActions';

type PocketRepairsProps = {
  pocket: PocketMonth;
  categoryId: string;
  month: string;
  onDone: () => void;
};

/**
 * A currency slot's deletion and repair actions (MC-10.6): deleting the
 * slot or the category's base child into another category, and the
 * explicit lane repairs (Move inherited balance, Merge, Choose owner and
 * re-entry of an amount recorded in another currency).
 */
export function PocketRepairs({
  pocket,
  categoryId,
  month,
  onDone,
}: PocketRepairsProps) {
  // Inherited lanes, and lanes that need a repair whatever their kind: the
  // reader reports a lane with no owner as its own slot lane.
  const lanes = pocket.lanes.filter(
    lane => lane.kind !== 'own' || REPAIRABLE.includes(lane.status),
  );
  return (
    <View style={{ gap: 12 }}>
      {lanes.map(lane => (
        <LaneRepair
          key={lane.laneId}
          lane={lane}
          pocket={pocket}
          month={month}
          onDone={onDone}
        />
      ))}
      <DeleteForm
        name="slot"
        exclude={categoryId}
        onDelete={transferId =>
          send('budget/pocket-delete', {
            id: pocket.id,
            ...(transferId && { transferId }),
          })
        }
        currency={pocket.currency}
        onDone={onDone}
      />
      <DeleteForm
        name="base"
        exclude={categoryId}
        onDelete={transferId =>
          send('budget/base-child-delete', {
            category: categoryId,
            ...(transferId && { transferId }),
          })
        }
        currency={pocket.currency}
        onDone={onDone}
      />
    </View>
  );
}

const REPAIRABLE: PocketLaneMonth['status'][] = [
  'duplicate',
  'orphan',
  'unresolved',
];

/** Live expense categories other than one, by name. */
export function useDestinations(exclude?: string) {
  const { data: categories } = useCategories();
  return (categories?.list ?? []).filter(
    c => !c.is_income && !c.tombstone && c.id !== exclude,
  );
}

function DeleteForm({
  name,
  exclude,
  currency,
  onDelete,
  onDone,
}: {
  name: 'slot' | 'base';
  exclude: string;
  currency: string;
  onDelete: (transferId: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const destinations = useDestinations(exclude);
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <ActionForm
      name={
        name === 'slot'
          ? t('Delete {{currency}}', { currency })
          : t('Delete base budget')
      }
      error={error}
      onSubmit={async () => {
        try {
          await onDelete(to);
          onDone();
        } catch {
          setError(
            t('Choose a category to receive this history, then delete again.'),
          );
        }
      }}
    >
      <SelectField label={t('Move its history to')} value={to} onChange={setTo}>
        <option value="">
          <Trans>No category</Trans>
        </option>
        {destinations.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit">
        {name === 'slot' ? (
          <Trans>Delete currency</Trans>
        ) : (
          <Trans>Delete base budget</Trans>
        )}
      </Button>
    </ActionForm>
  );
}

function LaneRepair({
  lane,
  pocket,
  month,
  onDone,
}: {
  lane: PocketLaneMonth;
  pocket: PocketMonth;
  month: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const category =
    categories?.list.find(c => c.id === lane.originCategoryId)?.name ??
    t('Deleted category');

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
  return (
    <AmountRepairForm
      lane={lane}
      pocket={pocket}
      category={category}
      reenter={lane.budgeted === null}
      onSubmit={amount =>
        lane.budgeted === null
          ? send('budget/pocket-reenter', {
              month,
              laneId: lane.laneId,
              ...amount,
            })
          : send('budget/pocket-move-inherited', {
              month,
              slotId: pocket.id,
              laneId: lane.laneId,
              amount,
            })
      }
      onDone={onDone}
    />
  );
}

/** Merge: retires a duplicate or orphan lane into its effective slot. */
export function MergeButton({
  laneId,
  onDone,
}: {
  laneId: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 4 }}>
      <Button
        onPress={async () => {
          try {
            await send('budget/pocket-merge', { laneId });
            onDone();
          } catch {
            setError(
              t('This lane has no category to merge into. Choose an owner.'),
            );
          }
        }}
      >
        <Trans>Merge into this slot</Trans>
      </Button>
      {error && <Text role="alert">{error}</Text>}
    </View>
  );
}

/** Choose owner: gives an unresolved lane a category's slot. */
export function ChooseOwnerForm({
  laneId,
  category,
  onDone,
}: {
  laneId: string;
  category: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const destinations = useDestinations();
  const [owner, setOwner] = useState('');
  return (
    <ActionForm
      name={t('Choose owner for {{category}} lane', { category })}
      error={null}
      onSubmit={async () => {
        if (!owner) return;
        await send('budget/pocket-choose-owner', {
          laneId,
          categoryId: owner,
        });
        onDone();
      }}
    >
      <SelectField label={t('Owner')} value={owner} onChange={setOwner}>
        <option value="">
          <Trans>Choose a category</Trans>
        </option>
        {destinations.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" isDisabled={!owner}>
        <Trans>Choose owner</Trans>
      </Button>
    </ActionForm>
  );
}

/**
 * Move inherited balance into the own lane, or re-entry of an amount
 * recorded in another currency. The amount keeps the encoding it was typed
 * at.
 */
function AmountRepairForm({
  lane,
  pocket,
  category,
  reenter,
  onSubmit,
  onDone,
}: {
  lane: PocketLaneMonth;
  pocket: PocketMonth;
  category: string;
  reenter: boolean;
  onSubmit: (
    amount: RequestAmount,
  ) => Promise<PocketWriteResult | { status: 'not-mismatched' }>;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const message = useStatusMessage();
  const { currency, precision } = pocket;
  const [amount, setAmount] = useState<RequestAmount | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <ActionForm
      name={
        reenter
          ? t('Re-enter {{category}} amount', { category })
          : t('Move from {{category}}', { category })
      }
      error={error}
      onSubmit={async () => {
        if (amount === null) return;
        const result = await onSubmit(amount);
        const text =
          result.status === 'not-mismatched'
            ? t('This amount is already recorded in its currency.')
            : message(result);
        if (text) setError(text);
        else onDone();
      }}
    >
      <AmountField
        label={t('Amount ({{currency}})', { currency })}
        currency={currency}
        precision={precision}
        onChange={(value, entered) =>
          setAmount(requestAmount(value, currency, entered))
        }
      />
      <Button type="submit" isDisabled={amount === null}>
        {reenter ? (
          <Trans>Save amount</Trans>
        ) : (
          <Trans>Move to this slot</Trans>
        )}
      </Button>
      {lane.status === 'retired' && !reenter && <View />}
    </ActionForm>
  );
}
