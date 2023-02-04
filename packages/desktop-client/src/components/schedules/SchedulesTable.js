import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import * as monthUtils from 'loot-core/src/shared/months';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Button,
  Tooltip,
  Menu
} from 'loot-design/src/components/common';
import {
  Table,
  TableHeader,
  Row,
  Field,
  Cell
} from 'loot-design/src/components/table';
import { colors } from 'loot-design/src/style';
import DotsHorizontalTriple from 'loot-design/src/svg/v1/DotsHorizontalTriple';
import Check from 'loot-design/src/svg/v2/Check';

import DisplayId from '../util/DisplayId';

import { StatusBadge } from './StatusBadge';

export let ROW_HEIGHT = 43;

function OverflowMenu({ schedule, status, onAction }) {
  let [open, setOpen] = useState(false);

  return (
    <View>
      <Button
        bare
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <DotsHorizontalTriple
          width={15}
          height={15}
          style={{ color: 'inherit', transform: 'rotateZ(90deg)' }}
        />
      </Button>
      {open && (
        <Tooltip
          position="bottom-right"
          width={150}
          style={{ padding: 0 }}
          onClose={() => setOpen(false)}
        >
          <Menu
            onMenuSelect={name => {
              onAction(name, schedule.id);
              setOpen(false);
            }}
            items={[
              status === 'due' && {
                name: 'post-transaction',
                text: 'Post transaction'
              },
              ...(schedule.completed
                ? [{ name: 'restart', text: 'Restart' }]
                : [
                    { name: 'skip', text: 'Skip next date' },
                    { name: 'complete', text: 'Complete' }
                  ]),
              { name: 'delete', text: 'Delete' }
            ]}
          />
        </Tooltip>
      )}
    </View>
  );
}

export function ScheduleAmountCell({ amount, op }) {
  let num = getScheduledAmount(amount);
  let str = integerToCurrency(Math.abs(num || 0));
  let isApprox = op === 'isapprox' || op === 'isbetween';

  return (
    <Cell
      width={100}
      plain
      style={{
        textAlign: 'right',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 5px'
      }}
    >
      {isApprox && (
        <View
          style={{
            textAlign: 'left',
            color: colors.n7,
            lineHeight: '1em',
            marginRight: 10
          }}
          title={(isApprox ? 'Approximately ' : '') + str}
        >
          ~
        </View>
      )}
      <Text
        style={{
          flex: 1,
          color: num > 0 ? colors.g5 : null,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={(isApprox ? 'Approximately ' : '') + str}
      >
        {num > 0 ? `+${str}` : `${str}`}
      </Text>
    </Cell>
  );
}

export function SchedulesTable({
  schedules,
  statuses,
  filter,
  minimal,
  allowCompleted,
  style,
  onSelect,
  onAction,
  tableStyle
}) {
  let dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

  let [showCompleted, setShowCompleted] = useState(false);

  let payees = useCachedPayees();
  let accounts = useCachedAccounts();

  let filteredSchedules = useMemo(() => {
    if (!filter) {
      return schedules;
    }
    const filterIncludes = str =>
      str
        ? str.toLowerCase().includes(filter.toLowerCase()) ||
          filter.toLowerCase().includes(str.toLowerCase())
        : false;

    return schedules.filter(schedule => {
      let payee = payees.find(p => schedule._payee === p.id);
      let account = accounts.find(a => schedule._account === a.id);
      let amount = getScheduledAmount(schedule._amount);
      let amountStr =
        (schedule._amountOp === 'isapprox' || schedule._amountOp === 'isbetween'
          ? '~'
          : '') +
        (amount > 0 ? '+' : '') +
        integerToCurrency(Math.abs(amount || 0));
      let dateStr = schedule.next_date
        ? monthUtils.format(schedule.next_date, dateFormat)
        : null;

      return (
        filterIncludes(payee && payee.name) ||
        filterIncludes(account && account.name) ||
        filterIncludes(amountStr) ||
        filterIncludes(statuses.get(schedule.id)) ||
        filterIncludes(dateStr)
      );
    });
  }, [schedules, filter, statuses]);

  let items = useMemo(() => {
    if (!allowCompleted) {
      return filteredSchedules.filter(s => !s.completed);
    }
    if (showCompleted) {
      return filteredSchedules;
    }
    let arr = filteredSchedules.filter(s => !s.completed);
    if (filteredSchedules.find(s => s.completed)) {
      arr.push({ type: 'show-completed' });
    }
    return arr;
  }, [filteredSchedules, showCompleted, allowCompleted]);

  function renderSchedule({ item }) {
    return (
      <Row
        height={ROW_HEIGHT}
        inset={15}
        backgroundColor="transparent"
        onClick={() => onSelect(item.id)}
        style={{
          cursor: 'pointer',
          backgroundColor: 'white',
          ':hover': { backgroundColor: colors.hover }
        }}
      >
        <Field width="flex">
          <DisplayId type="payees" id={item._payee} />
        </Field>
        <Field width="flex">
          <DisplayId type="accounts" id={item._account} />
        </Field>
        <Field width={110}>
          {item.next_date
            ? monthUtils.format(item.next_date, dateFormat)
            : null}
        </Field>
        <Field width={120} style={{ alignItems: 'flex-start' }}>
          <StatusBadge status={statuses.get(item.id)} />
        </Field>
        <ScheduleAmountCell amount={item._amount} op={item._amountOp} />
        {!minimal && (
          <Field width={80} style={{ textAlign: 'center' }}>
            {item._date && item._date.frequency && (
              <Check style={{ width: 13, height: 13 }} />
            )}
          </Field>
        )}
        {!minimal && (
          <Field width={40}>
            <OverflowMenu
              schedule={item}
              status={statuses.get(item.id)}
              onAction={onAction}
            />
          </Field>
        )}
      </Row>
    );
  }

  function renderItem({ item }) {
    if (item.type === 'show-completed') {
      return (
        <Row
          height={ROW_HEIGHT}
          inset={15}
          backgroundColor="transparent"
          style={{
            cursor: 'pointer',
            backgroundColor: 'white',
            ':hover': { backgroundColor: colors.hover }
          }}
          onClick={() => setShowCompleted(true)}
        >
          <Field
            width="flex"
            style={{
              fontStyle: 'italic',
              textAlign: 'center',
              color: colors.n6
            }}
          >
            Show completed schedules
          </Field>
        </Row>
      );
    }
    return renderSchedule({ item });
  }

  return (
    <View style={[{ flex: 1 }, tableStyle]}>
      <TableHeader height={ROW_HEIGHT} inset={15} version="v2">
        <Field width="flex">Payee</Field>
        <Field width="flex">Account</Field>
        <Field width={110}>Next date</Field>
        <Field width={120}>Status</Field>
        <Field width={100} style={{ textAlign: 'right' }}>
          Amount
        </Field>
        {!minimal && (
          <Field width={80} style={{ textAlign: 'center' }}>
            Recurring
          </Field>
        )}
        {!minimal && <Field width={40}></Field>}
      </TableHeader>
      <Table
        rowHeight={ROW_HEIGHT}
        backgroundColor="transparent"
        version="v2"
        style={[{ flex: 1, backgroundColor: 'transparent' }, style]}
        items={items}
        renderItem={renderItem}
        renderEmpty={filter ? 'No matching schedules' : 'No schedules'}
        allowPopupsEscape={items.length < 6}
      />
    </View>
  );
}
