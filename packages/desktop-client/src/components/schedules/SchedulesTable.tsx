import React, { useState, useMemo, type CSSProperties } from 'react';
import { useSelector } from 'react-redux';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import {
  type ScheduleStatusType,
  type ScheduleStatuses,
} from 'loot-core/src/client/data-hooks/schedules';
import { format as monthUtilFormat } from 'loot-core/src/shared/months';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import Check from '../../icons/v2/Check';
import { theme } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';
import { Table, TableHeader, Row, Field, Cell } from '../table';
import { Tooltip } from '../tooltips';
import DisplayId from '../util/DisplayId';

import { StatusBadge } from './StatusBadge';

type SchedulesTableProps = {
  schedules: ScheduleEntity[];
  statuses: ScheduleStatuses;
  filter: string;
  allowCompleted: boolean;
  onSelect: (id: ScheduleEntity['id']) => void;
  onAction: (actionName: ScheduleItemAction, id: ScheduleEntity['id']) => void;
  style: CSSProperties;
  minimal?: boolean;
  tableStyle?: CSSProperties;
};

type CompletedScheduleItem = { id: 'show-completed' };
type SchedulesTableItem = ScheduleEntity | CompletedScheduleItem;

export type ScheduleItemAction =
  | 'post-transaction'
  | 'skip'
  | 'complete'
  | 'restart'
  | 'delete';

export const ROW_HEIGHT = 43;

function OverflowMenu({
  schedule,
  status,
  onAction,
}: {
  schedule: ScheduleEntity;
  status: ScheduleStatusType;
  onAction: SchedulesTableProps['onAction'];
}) {
  const [open, setOpen] = useState(false);

  const getMenuItems = () => {
    const menuItems: { name: ScheduleItemAction; text: string }[] = [];

    if (status === 'due') {
      menuItems.push({
        name: 'post-transaction',
        text: 'Post transaction',
      });
    }

    if (status === 'completed') {
      menuItems.push({
        name: 'restart',
        text: 'Restart',
      });
    } else {
      menuItems.push(
        {
          name: 'skip',
          text: 'Skip next date',
        },
        {
          name: 'complete',
          text: 'Complete',
        },
      );
    }

    menuItems.push({ name: 'delete', text: 'Delete' });

    return menuItems;
  };

  return (
    <View>
      <Button
        type="bare"
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <DotsHorizontalTriple
          width={15}
          height={15}
          style={{ transform: 'rotateZ(90deg)' }}
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
            onMenuSelect={(name: ScheduleItemAction) => {
              onAction(name, schedule.id);
              setOpen(false);
            }}
            items={getMenuItems()}
          />
        </Tooltip>
      )}
    </View>
  );
}

export function ScheduleAmountCell({
  amount,
  op,
}: {
  amount: ScheduleEntity['_amount'];
  op: ScheduleEntity['_amountOp'];
}) {
  const num = getScheduledAmount(amount);
  const str = integerToCurrency(Math.abs(num || 0));
  const isApprox = op === 'isapprox' || op === 'isbetween';

  return (
    <Cell
      width={100}
      plain
      style={{
        textAlign: 'right',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 5px',
      }}
      name="amount"
    >
      {isApprox && (
        <View
          style={{
            textAlign: 'left',
            color: theme.pageTextSubdued,
            lineHeight: '1em',
            marginRight: 10,
          }}
          title={(isApprox ? 'Approximately ' : '') + str}
        >
          ~
        </View>
      )}
      <Text
        style={{
          flex: 1,
          color: num > 0 ? theme.noticeText : theme.tableText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={(isApprox ? 'Approximately ' : '') + str}
      >
        <PrivacyFilter>{num > 0 ? `+${str}` : `${str}`}</PrivacyFilter>
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
  tableStyle,
}: SchedulesTableProps) {
  const dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

  const [showCompleted, setShowCompleted] = useState(false);

  const payees = useCachedPayees();
  const accounts = useCachedAccounts();

  const filteredSchedules = useMemo(() => {
    if (!filter) {
      return schedules;
    }
    const filterIncludes = (str: string) =>
      str
        ? str.toLowerCase().includes(filter.toLowerCase()) ||
          filter.toLowerCase().includes(str.toLowerCase())
        : false;

    return schedules.filter(schedule => {
      const payee = payees.find(p => schedule._payee === p.id);
      const account = accounts.find(a => schedule._account === a.id);
      const amount = getScheduledAmount(schedule._amount);
      const amountStr =
        (schedule._amountOp === 'isapprox' || schedule._amountOp === 'isbetween'
          ? '~'
          : '') +
        (amount > 0 ? '+' : '') +
        integerToCurrency(Math.abs(amount || 0));
      const dateStr = schedule.next_date
        ? monthUtilFormat(schedule.next_date, dateFormat)
        : null;

      return (
        filterIncludes(schedule.name) ||
        filterIncludes(payee && payee.name) ||
        filterIncludes(account && account.name) ||
        filterIncludes(amountStr) ||
        filterIncludes(statuses.get(schedule.id)) ||
        filterIncludes(dateStr)
      );
    });
  }, [schedules, filter, statuses]);

  const items: SchedulesTableItem[] = useMemo(() => {
    const unCompletedSchedules = filteredSchedules.filter(s => !s.completed);

    if (!allowCompleted) {
      return unCompletedSchedules;
    }
    if (showCompleted) {
      return filteredSchedules;
    }

    const hasCompletedSchedule = filteredSchedules.find(s => s.completed);

    if (!hasCompletedSchedule) return unCompletedSchedules;

    return [...unCompletedSchedules, { id: 'show-completed' }];
  }, [filteredSchedules, showCompleted, allowCompleted]);

  function renderSchedule({ schedule }: { schedule: ScheduleEntity }) {
    return (
      <Row
        height={ROW_HEIGHT}
        inset={15}
        onClick={() => onSelect(schedule.id)}
        style={{
          cursor: 'pointer',
          backgroundColor: theme.tableBackground,
          color: theme.tableText,
          ':hover': { backgroundColor: theme.tableRowBackgroundHover },
        }}
      >
        <Field width="flex" name="name">
          <Text
            style={
              schedule.name == null
                ? { color: theme.buttonNormalDisabledText }
                : null
            }
            title={schedule.name ? schedule.name : ''}
          >
            {schedule.name ? schedule.name : 'None'}
          </Text>
        </Field>
        <Field width="flex" name="payee">
          <DisplayId type="payees" id={schedule._payee} />
        </Field>
        <Field width="flex" name="account">
          <DisplayId type="accounts" id={schedule._account} />
        </Field>
        <Field width={110} name="date">
          {schedule.next_date
            ? monthUtilFormat(schedule.next_date, dateFormat)
            : null}
        </Field>
        <Field width={120} name="status" style={{ alignItems: 'flex-start' }}>
          <StatusBadge status={statuses.get(schedule.id)} />
        </Field>
        <ScheduleAmountCell amount={schedule._amount} op={schedule._amountOp} />
        {!minimal && (
          <Field width={80} style={{ textAlign: 'center' }}>
            {schedule._date && schedule._date.frequency && (
              <Check style={{ width: 13, height: 13 }} />
            )}
          </Field>
        )}
        {!minimal && (
          <Field width={40} name="actions">
            <OverflowMenu
              schedule={schedule}
              status={statuses.get(schedule.id)}
              onAction={onAction}
            />
          </Field>
        )}
      </Row>
    );
  }

  function renderItem({ item }: { item: SchedulesTableItem }) {
    if (item.id === 'show-completed') {
      return (
        <Row
          height={ROW_HEIGHT}
          inset={15}
          style={{
            cursor: 'pointer',
            backgroundColor: 'transparent',
            ':hover': { backgroundColor: theme.tableRowBackgroundHover },
          }}
          onClick={() => setShowCompleted(true)}
        >
          <Field
            width="flex"
            style={{
              fontStyle: 'italic',
              textAlign: 'center',
              color: theme.tableText,
            }}
          >
            Show completed schedules
          </Field>
        </Row>
      );
    }
    return renderSchedule({ schedule: item as ScheduleEntity });
  }

  return (
    <View style={{ flex: 1, ...tableStyle }}>
      <TableHeader height={ROW_HEIGHT} inset={15} version="v2">
        <Field width="flex">Name</Field>
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
        {!minimal && <Field width={40} />}
      </TableHeader>
      <Table
        rowHeight={ROW_HEIGHT}
        backgroundColor="transparent"
        version="v2"
        style={{ flex: 1, backgroundColor: 'transparent', ...style }}
        items={items as ScheduleEntity[]}
        renderItem={renderItem}
        renderEmpty={filter ? 'No matching schedules' : 'No schedules'}
        allowPopupsEscape={items.length < 6}
      />
    </View>
  );
}
