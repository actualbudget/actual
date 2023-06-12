import React from 'react';
import { useHistory } from 'react-router-dom';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { send } from 'loot-core/src/platform/client/fetch';

import { View, Button } from '../common';
import { Page } from '../Page';

import { FiltersTable, ROW_HEIGHT } from './FiltersTable';

export default function Filters() {
  let history = useHistory();

  //let [filter, setFilter] = useState('');

  let filterData = useFilters();
  //let filterData = [];

  if (filterData == null) {
    return null;
  }

  let filters = filterData;

  let filterz = filters.map((cond, i) => {
    // 50 is default height for filters with 1 condition, 25 is for any additional conditions
    let heightCalc = 50 + 25 * (cond.conditions.length - 1);

    return { ...cond, rowHeight: heightCalc };
  });

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

  //<Search placeholder="Filter filters…" value={filter} onChange={setFilter} />

  return (
    <Page title="Filters">
      <View style={{ alignItems: 'flex-end' }}></View>

      <View
        style={{
          marginTop: 20,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(filterz.length, 1) + 1),
          overflow: 'hidden',
        }}
      >
        <FiltersTable
          filters={filterz}
          //filter={filter}
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
          Create new Filter
        </Button>
      </View>
    </Page>
  );
}
