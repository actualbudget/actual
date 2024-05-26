import React, { useRef, useState } from 'react';

import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { FilterMenu } from './FilterMenu';
import { NameFilter } from './NameFilter';

export type SavedFilter = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  id?: string;
  name: string;
  status?: string;
};

export function SavedFilterMenuButton({
  filters,
  conditionsOp,
  filterId,
  onClearFilters,
  onReloadSavedFilter,
  filtersList,
}: {
  filters: RuleConditionEntity[];
  conditionsOp: string;
  filterId: SavedFilter;
  onClearFilters: () => void;
  onReloadSavedFilter: (savedFilter: SavedFilter, value?: string) => void;
  filtersList: RuleConditionEntity[];
}) {
  const [nameOpen, setNameOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const [err, setErr] = useState(null);
  const [menuItem, setMenuItem] = useState('');
  const [name, setName] = useState(filterId.name);
  const id = filterId.id;
  let savedFilter: SavedFilter;

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
        savedFilter = {
          conditions: filters,
          conditionsOp,
          id: filterId.id,
          name: filterId.name,
          status: 'saved',
        };
        const response = await sendCatch('filter-update', {
          state: savedFilter,
          filters: [...filtersList],
        });

        if (response.error) {
          setErr(response.error.message);
          setNameOpen(true);
          return;
        }

        onReloadSavedFilter(savedFilter, 'update');
        break;
      case 'save-filter':
        setErr(null);
        setAdding(true);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'reload-filter':
        setMenuOpen(false);
        savedFilter = {
          ...savedFilter,
          status: 'saved',
        };
        onReloadSavedFilter(savedFilter, 'reload');
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
        conditions: filters,
        conditionsOp,
        name,
        status: 'saved',
      };

      const response = await sendCatch('filter-create', {
        state: newSavedFilter,
        filters: [...filtersList],
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
      conditions: filterId.conditions,
      conditionsOp: filterId.conditionsOp,
      id: filterId.id,
      name,
    };

    const response = await sendCatch('filter-update', {
      state: updatedFilter,
      filters: [...filtersList],
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
      {filters.length > 0 && (
        <Button
          ref={triggerRef}
          type="bare"
          style={{ marginTop: 10 }}
          onClick={() => {
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
            {!filterId.id ? 'Unsaved filter' : filterId.name}&nbsp;
          </Text>
          {filterId.id && filterId.status !== 'saved' && (
            <Text>(modified)&nbsp;</Text>
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
