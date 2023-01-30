import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { View, Button, Input } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Page } from '../Page';

import { SchedulesTable, ROW_HEIGHT } from './SchedulesTable';

export default function Schedules() {
  let history = useHistory();

  let [filter, setFilter] = useState('');

  let scheduleData = useSchedules();
  let payees = useCachedPayees();
  let accounts = useCachedAccounts();

  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  function onEdit(id) {
    history.push(`/schedule/edit/${id}`, { locationPtr: history.location });
  }

  function onAdd() {
    history.push(`/schedule/edit`, { locationPtr: history.location });
  }

  function onDiscover() {
    history.push(`/schedule/discover`, { locationPtr: history.location });
  }

  async function onAction(name, id) {
    switch (name) {
      case 'post-transaction':
        await send('schedule/post-transaction', { id });
        break;
      case 'skip':
        await send('schedule/skip-next-date', { id });
        break;
      case 'complete':
        await send('schedule/update', { schedule: { id, completed: true } });
        break;
      case 'restart':
        await send('schedule/update', {
          schedule: { id, completed: false },
          resetNextDate: true
        });
        break;
      case 'delete':
        await send('schedule/delete', { id });
        break;
      default:
    }
  }

  const filterIncludes = str =>
    str
      ? str.toLowerCase().includes(filter.toLowerCase()) ||
        str.toLowerCase().includes(filter.toLowerCase())
      : true;

  return (
    <Page title="Schedules">
      <View style={{ alignItems: 'flex-end' }}>
        <Input
          placeholder="Filter schedules..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: 350,
            borderColor: 'transparent',
            backgroundColor: colors.n11,
            ':focus': {
              backgroundColor: 'white',
              '::placeholder': { color: colors.n8 }
            }
          }}
        />
      </View>

      <View
        style={{
          marginTop: 20,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1),
          overflow: 'hidden'
        }}
      >
        <SchedulesTable
          schedules={
            filter
              ? schedules.filter(s => {
                  let payee = payees.find(p => s._payee === p.id);
                  let account = accounts.find(a => s._account === a.id);
                  let amount = getScheduledAmount(s._amount);
                  let amountStr =
                    (s._amountOp === 'isapprox' || s._amountOp === 'isbetween'
                      ? '~'
                      : '') +
                    (amount > 0 ? '+' : '') +
                    integerToCurrency(Math.abs(amount || 0));

                  return (
                    filterIncludes(payee && payee.name) ||
                    filterIncludes(account && account.name) ||
                    filterIncludes(amountStr) ||
                    filterIncludes(statuses.get(s.id))
                  );
                })
              : schedules
          }
          filtered={filter !== ''}
          statuses={statuses}
          allowCompleted={true}
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: 'white' }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          margin: '20px 0',
          flexShrink: 0
        }}
      >
        <Button onClick={onDiscover}>Find schedules</Button>
        <Button primary onClick={onAdd}>
          Add new schedule
        </Button>
      </View>
    </Page>
  );
}
