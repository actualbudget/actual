import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgSubtract } from '@actual-app/components/icons/v0';
import { SvgLightBulb } from '@actual-app/components/icons/v1';
import { SvgViewHide, SvgViewShow } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import { memoizeOne } from '@actual-app/core/shared/memoize';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { groupById } from '@actual-app/core/shared/util';
import type { Diff } from '@actual-app/core/shared/util';
import type { PayeeEntity } from '@actual-app/core/types/models';

import { EmptyMessage } from '#components/common/EmptyMessage';
import { ManagePage } from '#components/common/ManagePage';
import { PageMenuButton } from '#components/common/PageMenuButton';
import { Search } from '#components/common/Search';
import { Cell, SelectCell, TableHeader } from '#components/table';
import {
  SelectedProvider,
  useSelected,
  useSelectedDispatch,
  useSelectedItems,
} from '#hooks/useSelected';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { PayeeTable } from './PayeeTable';
import { SelectedPayeesButton } from './SelectedPayeesButton';

const getPayeesById = memoizeOne((payees: PayeeEntity[]) => groupById(payees));

function PayeeTableHeader() {
  const { t } = useTranslation();

  const dispatchSelected = useSelectedDispatch();
  const selectedItems = useSelectedItems();

  return (
    <View>
      <TableHeader collapsed>
        <SelectCell
          exposed
          focused={false}
          selected={selectedItems.size > 0}
          icon={<SvgSubtract width={6} height={6} />}
          onSelect={e =>
            dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
          }
        />
        <Cell value={t('Name')} width="flex" />
      </TableHeader>
    </View>
  );
}

type ManagePayeesProps = {
  payees: PayeeEntity[];
  ruleCounts: ComponentProps<typeof PayeeTable>['ruleCounts'];
  orphanedPayees: Array<Pick<PayeeEntity, 'id'>>;
  initialSelectedIds: string[];
  onBatchChange: (diff: Diff<PayeeEntity>) => void;
  onViewRules: ComponentProps<typeof PayeeTable>['onViewRules'];
  onCreateRule: ComponentProps<typeof PayeeTable>['onCreateRule'];
  onMerge: (ids: string[]) => Promise<void>;
};

export const ManagePayees = ({
  payees,
  ruleCounts,
  orphanedPayees,
  initialSelectedIds,
  onBatchChange,
  onViewRules,
  onCreateRule,
  ...props
}: ManagePayeesProps) => {
  const [filter, setFilter] = useState('');
  const table = useRef(null);
  const [orphanedOnly, setOrphanedOnly] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const filteredPayees = useMemo(() => {
    let filtered = payees;
    if (filter) {
      filtered = filtered.filter(p =>
        getNormalisedString(
          (p.transfer_acct ? t('Transfer: ') : '') + p.name,
        ).includes(getNormalisedString(filter)),
      );
    }
    if (orphanedOnly) {
      filtered = filtered.filter(p =>
        orphanedPayees.map(o => o.id).includes(p.id),
      );
    }
    return filtered;
  }, [payees, filter, orphanedOnly, orphanedPayees, t]);

  const selected = useSelected('payees', filteredPayees, initialSelectedIds);

  function applyFilter(f: string) {
    if (filter !== f) {
      setFilter(f);
    }
  }

  const onUpdate = useCallback(
    <T extends 'name' | 'favorite' | 'learn_categories'>(
      id: PayeeEntity['id'],
      name: T,
      value: PayeeEntity[T],
    ) => {
      const payee = payees.find(p => p.id === id);
      if (payee && payee[name] !== value) {
        onBatchChange({
          updated: [{ id, [name]: value }],
          added: [],
          deleted: [],
        });
      }
    },
    [payees, onBatchChange],
  );

  const getSelectableIds = useCallback(() => {
    return Promise.resolve(
      filteredPayees.filter(p => p.transfer_acct == null).map(p => p.id),
    );
  }, [filteredPayees]);

  function onDelete(ids?: { id: string }[]) {
    onBatchChange({
      deleted: ids ?? [...selected.items].map(id => ({ id })),
      updated: [],
      added: [],
    });
    if (!ids) selected.dispatch({ type: 'select-none' });
  }

  function onFavorite() {
    const allFavorited = [...selected.items]
      .map(id => payeesById[id].favorite)
      .every(f => f);
    if (allFavorited) {
      onBatchChange({
        updated: [...selected.items].map(id => ({ id, favorite: false })),
        added: [],
        deleted: [],
      });
    } else {
      onBatchChange({
        updated: [...selected.items].map(id => ({ id, favorite: true })),
        added: [],
        deleted: [],
      });
    }
    selected.dispatch({ type: 'select-none' });
  }

  function onLearn() {
    const allLearnCategories = [...selected.items]
      .map(id => payeesById[id].learn_categories)
      .every(f => f);
    if (allLearnCategories) {
      onBatchChange({
        updated: [...selected.items].map(id => ({
          id,
          learn_categories: false,
        })),
        added: [],
        deleted: [],
      });
    } else {
      onBatchChange({
        updated: [...selected.items].map(id => ({
          id,
          learn_categories: true,
        })),
        added: [],
        deleted: [],
      });
    }
    selected.dispatch({ type: 'select-none' });
  }

  async function onMerge() {
    const ids = [...selected.items];
    if (ids.length < 2) return;

    const targetPayeeId = ids[0];

    dispatch(
      pushModal({
        modal: {
          name: 'confirm-payees-merge',
          options: {
            payeeIds: ids.filter(id => id !== targetPayeeId),
            targetPayeeId,
            onConfirm: async () => {
              await props.onMerge(ids);
              selected.dispatch({ type: 'select-none' });
            },
          },
        },
      }),
    );
  }

  const onChangeCategoryLearning = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'payee-category-learning' } }));
  }, [dispatch]);

  const payeesById = getPayeesById(payees);
  const hasOrphanedPayees = orphanedOnly || orphanedPayees.length > 0;

  return (
    <SelectedProvider instance={selected} fetchAllIds={getSelectableIds}>
      <ManagePage
        search={
          <Search
            placeholder={t('Filter payees…')}
            value={filter}
            onChange={applyFilter}
          />
        }
        selection={
          <SelectedPayeesButton
            payeesById={payeesById}
            onDelete={onDelete}
            onMerge={onMerge}
            onFavorite={onFavorite}
            onLearn={onLearn}
          />
        }
        menu={
          <PageMenuButton<'toggle-unused' | 'category-learning'>
            items={[
              ...(hasOrphanedPayees
                ? [
                    orphanedOnly
                      ? {
                          name: 'toggle-unused',
                          text: t('Show all payees'),
                          icon: SvgViewShow,
                        }
                      : {
                          name: 'toggle-unused',
                          text: t('Show {{count}} unused payees', {
                            count: orphanedPayees.length,
                          }),
                          icon: SvgViewHide,
                        },
                  ]
                : []),
              {
                name: 'category-learning',
                text: t('Category learning settings'),
                icon: SvgLightBulb,
              },
            ]}
            onMenuSelect={name => {
              if (name === 'toggle-unused') {
                setOrphanedOnly(prev => !prev);
              } else {
                onChangeCategoryLearning();
              }
            }}
          />
        }
      >
        <View style={styles.tableContainer}>
          <PayeeTableHeader />
          {filteredPayees.length === 0 ? (
            <EmptyMessage>
              <Trans>No payees</Trans>
            </EmptyMessage>
          ) : (
            <PayeeTable
              ref={table}
              payees={filteredPayees}
              ruleCounts={ruleCounts}
              onUpdate={onUpdate}
              onViewRules={onViewRules}
              onCreateRule={onCreateRule}
              onDelete={ids => onDelete(ids.map(id => ({ id })))}
            />
          )}
        </View>
      </ManagePage>
    </SelectedProvider>
  );
};
