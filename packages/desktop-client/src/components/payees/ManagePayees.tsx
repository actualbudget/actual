import {
  useState,
  useRef,
  useMemo,
  useCallback,
  type ComponentProps,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow, SvgSubtract } from '@actual-app/components/icons/v0';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import memoizeOne from 'memoize-one';

import { getNormalisedString } from 'loot-core/shared/normalisation';
import { type Diff, groupById } from 'loot-core/shared/util';
import { type PayeeEntity } from 'loot-core/types/models';

import { PayeeMenu } from './PayeeMenu';
import { PayeeTable } from './PayeeTable';

import { Search } from '@desktop-client/components/common/Search';
import {
  TableHeader,
  Cell,
  SelectCell,
} from '@desktop-client/components/table';
import {
  useSelected,
  SelectedProvider,
  useSelectedDispatch,
  useSelectedItems,
} from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

const getPayeesById = memoizeOne((payees: PayeeEntity[]) => groupById(payees));

function PayeeTableHeader() {
  const dispatchSelected = useSelectedDispatch();
  const selectedItems = useSelectedItems();

  return (
    <View>
      <TableHeader
        style={{
          backgroundColor: theme.tableBackground,
          color: theme.pageTextLight,
          zIndex: 200,
          userSelect: 'none',
        }}
        collapsed={true}
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={selectedItems.size > 0}
          icon={<SvgSubtract width={6} height={6} />}
          onSelect={e =>
            dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
          }
        />
        <Cell value="Name" width="flex" />
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
  const triggerRef = useRef(null);
  const [orphanedOnly, setOrphanedOnly] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const filteredPayees = useMemo(() => {
    let filtered = payees;
    if (filter) {
      filtered = filtered.filter(p =>
        getNormalisedString(p.name).includes(getNormalisedString(filter)),
      );
    }
    if (orphanedOnly) {
      filtered = filtered.filter(p =>
        orphanedPayees.map(o => o.id).includes(p.id),
      );
    }
    return filtered;
  }, [payees, filter, orphanedOnly, orphanedPayees]);

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
    await props.onMerge(ids);

    selected.dispatch({ type: 'select-none' });
  }

  const onChangeCategoryLearning = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'payee-category-learning' } }));
  }, [dispatch]);

  const buttonsDisabled = selected.items.size === 0;

  const payeesById = getPayeesById(payees);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ height: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 0 15px',
        }}
      >
        <View style={{ flexShrink: 0 }}>
          <Button
            ref={triggerRef}
            variant="bare"
            style={{ marginRight: 10 }}
            isDisabled={buttonsDisabled}
            onPress={() => setMenuOpen(true)}
          >
            {buttonsDisabled
              ? t('No payees selected')
              : t('{{count}} payees', {
                  count: selected.items.size,
                })}
            <SvgExpandArrow width={8} height={8} style={{ marginLeft: 5 }} />
          </Button>

          <Popover
            triggerRef={triggerRef}
            isOpen={menuOpen}
            placement="bottom start"
            style={{ width: 250 }}
            onOpenChange={() => setMenuOpen(false)}
          >
            <PayeeMenu
              payeesById={payeesById}
              selectedPayees={selected.items}
              onClose={() => setMenuOpen(false)}
              onDelete={onDelete}
              onMerge={onMerge}
              onFavorite={onFavorite}
              onLearn={onLearn}
            />
          </Popover>
        </View>
        <View
          style={{
            flexShrink: 0,
          }}
        >
          {(orphanedOnly || (orphanedPayees && orphanedPayees.length > 0)) && (
            <Button
              variant="bare"
              style={{ marginRight: 10 }}
              onPress={() => setOrphanedOnly(prev => !prev)}
            >
              {orphanedOnly
                ? t('Show all payees')
                : t('Show {{count}} unused payees', {
                    count: orphanedPayees.length,
                  })}
            </Button>
          )}
        </View>
        <View style={{ flex: 1 }} />
        <Search
          placeholder={t('Filter payees...')}
          value={filter}
          onChange={applyFilter}
        />
      </View>

      <SelectedProvider instance={selected} fetchAllIds={getSelectableIds}>
        <View
          style={{
            flex: 1,
            border: '1px solid ' + theme.tableBorder,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            overflow: 'hidden',
          }}
        >
          <PayeeTableHeader />
          {filteredPayees.length === 0 ? (
            <View
              style={{
                textAlign: 'center',
                color: theme.pageTextSubdued,
                fontStyle: 'italic',
                fontSize: 13,
                marginTop: 5,
              }}
            >
              <Trans>No payees</Trans>
            </View>
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
      </SelectedProvider>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          margin: '20px 0',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1em',
          }}
        >
          <Button
            aria-label={t('Category learning settings')}
            variant="normal"
            onPress={onChangeCategoryLearning}
          >
            <Trans>Category learning settings</Trans>
          </Button>
        </View>
      </View>
    </View>
  );
};
