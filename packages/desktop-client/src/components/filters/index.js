import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { send } from 'loot-core/src/platform/client/fetch';

import { View, Button, Search } from '../common';
import { Page } from '../Page';

import { FiltersTable, ROW_HEIGHT } from './FiltersTable';

export default function Filters() {
  let history = useHistory();

  let [filter, setFilter] = useState('');

  let filterData = useFilters();

  if (filterData == null) {
    return null;
  }

  let filters = filterData;

  function onEdit(id) {
    history.push(`/filters/edit/${id}`, { locationPtr: history.location });
  }

  function onAdd() {
    history.push(`/filters/edit`, { locationPtr: history.location });
  }

  async function onAction(name, id) {
    switch (name) {
      case 'delete':
        await send('filter/delete', { id });
        break;
      default:
    }
  }

  return (
    <Page title="Filters">
      <View style={{ alignItems: 'flex-end' }}>
        <Search
          placeholder="Filter filters..."
          value={filter}
          onChange={setFilter}
        />
      </View>

      <View
        style={{
          marginTop: 20,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(filters.length, 1) + 1),
          overflow: 'hidden',
        }}
      >
        <FiltersTable
          filters={filters}
          filter={filter}
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: 'white' }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          margin: '20px 0',
          flexShrink: 0,
        }}
      >
        <Button primary onClick={onAdd}>
          Create new filter
        </Button>
      </View>
    </Page>
  );
}
