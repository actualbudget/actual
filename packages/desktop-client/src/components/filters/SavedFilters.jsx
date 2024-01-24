import React, { useState, useRef, useEffect } from 'react';

import { send, sendCatch } from 'loot-core/src/platform/client/fetch';

import { SvgExpandArrow } from '../../icons/v0';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { MenuTooltip } from '../common/MenuTooltip';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel } from '../forms';
import { FieldSelect } from '../modals/EditRule';
import { GenericInput } from '../util/GenericInput';

import { AppliedFilters } from './AppliedFilters';

function FilterMenu({ onClose, filterId, onFilterMenuSelect }) {
  return (
    <MenuTooltip width={200} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onFilterMenuSelect(item);
        }}
        items={[
          ...(!filterId.id
            ? [
                { name: 'save-filter', text: 'Save new filter' },
                { name: 'clear-filter', text: 'Clear all conditions' },
              ]
            : [
                ...(filterId.id !== null && filterId.status === 'saved'
                  ? [
                      { name: 'rename-filter', text: 'Rename' },
                      { name: 'delete-filter', text: 'Delete' },
                      Menu.line,
                      {
                        name: 'save-filter',
                        text: 'Save new filter',
                        disabled: true,
                      },
                      { name: 'clear-filter', text: 'Clear all conditions' },
                    ]
                  : [
                      { name: 'rename-filter', text: 'Rename' },
                      { name: 'update-filter', text: 'Update condtions' },
                      { name: 'reload-filter', text: 'Revert changes' },
                      { name: 'delete-filter', text: 'Delete' },
                      Menu.line,
                      { name: 'save-filter', text: 'Save new filter' },
                      { name: 'clear-filter', text: 'Clear all conditions' },
                    ]),
              ]),
        ]}
      />
    </MenuTooltip>
  );
}

function NameFilter({
  onClose,
  menuItem,
  name,
  setName,
  adding,
  onAddUpdate,
  err,
}) {
  const inputRef = useRef();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <MenuTooltip width={325} onClose={onClose}>
      {menuItem !== 'update-filter' && (
        <form>
          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ padding: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title="Filter Name"
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <GenericInput
                inputRef={inputRef}
                id="name-field"
                field="string"
                type="string"
                value={name}
                onChange={setName}
              />
            </FormField>
            <Button
              type="primary"
              style={{ marginTop: 18 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate();
              }}
            >
              {adding ? 'Add' : 'Update'}
            </Button>
          </Stack>
        </form>
      )}
      {err && (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      )}
    </MenuTooltip>
  );
}

function SavedFilterMenuButton({
  filters,
  conditionsOp,
  filterId,
  onClearFilters,
  onReloadSavedFilter,
  filtersList,
}) {
  const [nameOpen, setNameOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [err, setErr] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [name, setName] = useState(filterId.name);
  const id = filterId.id;
  let res;
  let savedFilter;

  const onFilterMenuSelect = async item => {
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
        res = await sendCatch('filter-update', {
          state: savedFilter,
          filters: [...filtersList],
        });
        if (res.error) {
          setErr(res.error.message);
          setNameOpen(true);
        } else {
          onReloadSavedFilter(savedFilter, 'update');
        }
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
      //create new flow
      savedFilter = {
        conditions: filters,
        conditionsOp,
        name,
        status: 'saved',
      };
      res = await sendCatch('filter-create', {
        state: savedFilter,
        filters: [...filtersList],
      });
      savedFilter = {
        ...savedFilter,
        id: res.data,
      };
    } else {
      //rename flow
      savedFilter = {
        conditions: filterId.conditions,
        conditionsOp: filterId.conditionsOp,
        id: filterId.id,
        name,
      };
      res = await sendCatch('filter-update', {
        state: savedFilter,
        filters: [...filtersList],
      });
    }
    if (res.error) {
      setErr(res.error.message);
    } else {
      setNameOpen(false);
      onReloadSavedFilter(savedFilter);
    }
  }

  return (
    <View>
      {filters.length > 0 && (
        <Button
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
      {menuOpen && (
        <FilterMenu
          onClose={() => setMenuOpen(false)}
          filterId={filterId}
          onFilterMenuSelect={onFilterMenuSelect}
        />
      )}
      {nameOpen && (
        <NameFilter
          onClose={() => setNameOpen(false)}
          menuItem={menuItem}
          name={name}
          setName={setName}
          adding={adding}
          onAddUpdate={onAddUpdate}
          err={err}
        />
      )}
    </View>
  );
}

export function CondOpMenu({ conditionsOp, onCondOpChange, filters }) {
  return filters.length > 1 ? (
    <Text style={{ color: theme.pageText, marginTop: 11, marginRight: 5 }}>
      <FieldSelect
        style={{ display: 'inline-flex' }}
        fields={[
          ['and', 'all'],
          ['or', 'any'],
        ]}
        value={conditionsOp}
        onChange={(name, value) => onCondOpChange(value, filters)}
      />
      of:
    </Text>
  ) : (
    <View />
  );
}

export function FiltersStack({
  filters,
  conditionsOp,
  onUpdateFilter,
  onDeleteFilter,
  onClearFilters,
  onReloadSavedFilter,
  filterId,
  filtersList,
  onCondOpChange,
}) {
  return (
    <View>
      <Stack
        spacing={2}
        direction="row"
        justify="flex-start"
        align="flex-start"
      >
        <AppliedFilters
          filters={filters}
          conditionsOp={conditionsOp}
          onCondOpChange={onCondOpChange}
          onUpdate={onUpdateFilter}
          onDelete={onDeleteFilter}
        />
        <View style={{ flex: 1 }} />
        <SavedFilterMenuButton
          filters={filters}
          conditionsOp={conditionsOp}
          filterId={filterId}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
          filtersList={filtersList}
        />
      </Stack>
    </View>
  );
}
