import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send, sendCatch } from 'loot-core/platform/client/fetch';
import {
  type TransactionFilterEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { FilterMenu } from './FilterMenu';
import { NameFilter } from './NameFilter';

export type SavedFilter = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  id?: string;
  name: string;
  status?: string;
};

export function SavedFilterMenuButton({
  conditions,
  conditionsOp,
  filterId,
  onClearFilters,
  onReloadSavedFilter,
  savedFilters,
}: {
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  filterId?: SavedFilter;
  onClearFilters: () => void;
  onReloadSavedFilter: (savedFilter: SavedFilter, value?: string) => void;
  savedFilters: TransactionFilterEntity[];
}) {
  const { t } = useTranslation();
  const [nameOpen, setNameOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const [err, setErr] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState('');
  const [name, setName] = useState(filterId?.name ?? '');
  const id = filterId?.id;
  const savedFilter = useRef<SavedFilter | null>(null);

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
        await send('filter-delete', id);
        onClearFilters();
        break;
      case 'update-filter':
        setErr(null);
        setAdding(false);
        setMenuOpen(false);
        savedFilter.current = {
          conditions,
          conditionsOp,
          id: filterId?.id,
          name: filterId?.name ?? '',
          status: 'saved',
        };
        const response = await sendCatch('filter-update', {
          state: savedFilter,
          filters: [...savedFilters],
        });

        if (response.error) {
          setErr(response.error.message);
          setNameOpen(true);
          return;
        }

        onReloadSavedFilter(savedFilter.current, 'update');
        break;
      case 'save-filter':
        setErr(null);
        setAdding(true);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'reload-filter':
        setMenuOpen(false);
        savedFilter.current = {
          ...savedFilter.current,
          status: 'saved',
        };
        onReloadSavedFilter(savedFilter.current, 'reload');
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
        conditions,
        conditionsOp,
        name,
        status: 'saved',
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
      });
      return;
    }

    const updatedFilter = {
      conditions: filterId?.conditions,
      conditionsOp: filterId?.conditionsOp,
      id: filterId?.id,
      name,
    };

    const response = await sendCatch('filter-update', {
      state: updatedFilter,
      filters: [...savedFilters],
    });

    if (response.error) {
      setErr(response.error.message);
      setNameOpen(true);
      return;
    }

    setNameOpen(false);
    onReloadSavedFilter(updatedFilter);
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
            {!filterId?.id ? t('Unsaved filter') : filterId?.name}&nbsp;
          </Text>
          {filterId?.id && filterId?.status !== 'saved' && (
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
          filterId={filterId}
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
