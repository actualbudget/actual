import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useFilters } from 'loot-core/client/data-hooks/filters';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { type TransactionFilterEntity } from 'loot-core/types/models';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button2';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { FilterMenu } from './FilterMenu';
import { NameFilter } from './NameFilter';

type SavedFilterMenuButtonProps = {
  conditions: readonly RuleConditionEntity[];
  conditionsOp: RuleConditionEntity['conditionsOp'];
  filter?: TransactionFilterEntity;
  dirtyFilter?: TransactionFilterEntity;
  onClearFilters: () => void;
  onReloadSavedFilter: (
    savedFilter: TransactionFilterEntity,
    action?: 'reload' | 'update',
  ) => void;
};

export function SavedFilterMenuButton({
  conditions,
  conditionsOp,
  filter,
  dirtyFilter,
  onClearFilters,
  onReloadSavedFilter,
}: SavedFilterMenuButtonProps) {
  const { t } = useTranslation();
  const [nameOpen, setNameOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const [err, setErr] = useState(null);
  const [menuItem, setMenuItem] = useState('');
  const [name, setName] = useState(filter?.name ?? '');
  const savedFilters = useFilters();

  const onFilterMenuSelect = async (item: string) => {
    setMenuItem(item);
    switch (item) {
      case 'rename-filter':
        setErr(null);
        setAdding(false);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'delete-filter':
        setMenuOpen(false);
        if (filter?.id) {
          await send('filter-delete', filter.id);
        }
        onClearFilters();
        break;
      case 'update-filter':
        setErr(null);
        setAdding(false);
        setMenuOpen(false);
        if (!filter || !dirtyFilter) {
          // No active filter or filter is not dirty, nothing to update.
          return;
        }
        const response = await sendCatch('filter-update', {
          state: dirtyFilter,
          filters: savedFilters,
        });

        if (response.error) {
          setErr(response.error.message);
          setNameOpen(true);
          return;
        }

        onReloadSavedFilter(dirtyFilter, 'update');
        break;
      case 'save-filter':
        setErr(null);
        setAdding(true);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'reload-filter':
        setMenuOpen(false);
        if (filter) {
          onReloadSavedFilter(filter, 'reload');
        }
        break;
      case 'clear-filter':
        setMenuOpen(false);
        onClearFilters();
        break;
      default:
    }
  };

  async function onAddUpdate() {
    if (adding) {
      const newSavedFilter = {
        conditions: [...conditions],
        conditionsOp: conditionsOp || 'and',
        name,
      };

      const response = await sendCatch('filter-create', {
        state: newSavedFilter,
        filters: [...savedFilters],
      });

      if (response.error) {
        setErr(response.error.message);
        setNameOpen(true);
        return;
      }

      setNameOpen(false);
      onReloadSavedFilter({
        ...newSavedFilter,
        id: response.data,
        tombstone: false,
      });
    } else {
      if (!filter) {
        return;
      }

      const updatedFilter = {
        ...filter,
        ...dirtyFilter,
        name,
      };

      const response = await sendCatch('filter-update', {
        state: updatedFilter,
        filters: [...savedFilters],
      });

      if (response.error) {
        setErr(response.error.message);
        setNameOpen(true);
      } else {
        setNameOpen(false);
        onReloadSavedFilter(updatedFilter);
      }
    }
  }

  return (
    <View>
      {conditions.length > 0 && (
        <Button
          ref={triggerRef}
          variant="bare"
          style={{ marginTop: 10 }}
          onPress={() => {
            setMenuOpen(true);
          }}
        >
          <Text
            style={{
              maxWidth: 150,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 0,
            }}
          >
            {!filter?.id ? t('Unsaved filter') : filter?.name}&nbsp;
          </Text>
          {filter?.id && !!dirtyFilter && (
            <Text>
              <Trans>(modified)</Trans>&nbsp;
            </Text>
          )}
          <SvgExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
        </Button>
      )}

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ width: 200 }}
      >
        <FilterMenu
          filter={filter}
          dirtyFilter={dirtyFilter}
          onFilterMenuSelect={onFilterMenuSelect}
        />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={nameOpen}
        onOpenChange={() => setNameOpen(false)}
        style={{ width: 325 }}
      >
        <NameFilter
          menuItem={menuItem}
          name={name}
          setName={setName}
          adding={adding}
          onAddUpdate={onAddUpdate}
          err={err}
        />
      </Popover>
    </View>
  );
}
