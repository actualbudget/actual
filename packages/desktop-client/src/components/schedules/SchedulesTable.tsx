// @ts-strict-ignore
import React, { useRef, useState, useMemo, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  type ScheduleStatusType,
  type ScheduleStatuses,
} from 'loot-core/src/client/data-hooks/schedules';
import { format as monthUtilFormat } from 'loot-core/src/shared/months';
import { getNormalisedString } from 'loot-core/src/shared/normalisation';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { usePayees } from '../../hooks/usePayees';
import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { SvgCheck } from '../../icons/v2';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { Table, TableHeader, Row, Field, Cell } from '../table';
import { DisplayId } from '../util/DisplayId';

import { StatusBadge } from './StatusBadge';

type SchedulesTableProps = {
  isLoading?: boolean;
  schedules: readonly ScheduleEntity[];
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
  const { t } = useTranslation();

  const getMenuItems = () => {
    const menuItems: { name: ScheduleItemAction; text: string }[] = [];

    menuItems.push({
      name: 'post-transaction',
      text: t('Post transaction'),
    });

    if (status === 'completed') {
      menuItems.push({
        name: 'restart',
        text: t('Restart'),
      });
    } else {
      menuItems.push(
        {
          name: 'skip',
          text: t('Skip next date'),
        },
        {
          name: 'complete',
          text: t('Complete'),
        },
      );
    }

    menuItems.push({ name: 'delete', text: t('Delete') });

    return menuItems;
  };

  return (
    <Menu
      onMenuSelect={name => {
        onAction(name, schedule.id);
      }}
      items={getMenuItems()}
    />
  );
}

export function ScheduleAmountCell({
  amount,
  op,
}: {
  amount: ScheduleEntity['_amount'];
  op: ScheduleEntity['_amountOp'];
}) {
  const { t } = useTranslation();

  const num = getScheduledAmount(amount);
  const currencyAmount = integerToCurrency(Math.abs(num || 0));
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
          title={
            isApprox
              ? t('Approximately {{currencyAmount}}', { currencyAmount })
              : currencyAmount
          }
        >
          ~
        </View>
      )}
      <Text
        style={{
          flex: 1,
          color: num > 0 ? theme.noticeTextLight : theme.tableText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={
          isApprox
            ? t('Approximately {{currencyAmount}}', { currencyAmount })
            : currencyAmount
        }
      >
        <PrivacyFilter>
          {num > 0 ? `+${currencyAmount}` : `${currencyAmount}`}
        </PrivacyFilter>
      </Text>
    </Cell>
  );
}

function ScheduleRow({
  schedule,
  onAction,
  onSelect,
  minimal,
  statuses,
  dateFormat,
}: { schedule: ScheduleEntity; dateFormat: string } & Pick<
  SchedulesTableProps,
  'onSelect' | 'onAction' | 'minimal' | 'statuses'
>) {
  const { t } = useTranslation();

  const rowRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState<false | 'contextMenu' | 'button'>(false);
  const [crossOffset, setCrossOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const contextMenusEnabled = useFeatureFlag('contextMenus');

  return (
    <Row
      ref={rowRef}
      height={ROW_HEIGHT}
      inset={15}
      onClick={() => onSelect(schedule.id)}
      style={{
        cursor: 'pointer',
        backgroundColor: theme.tableBackground,
        color: theme.tableText,
        ':hover': { backgroundColor: theme.tableRowBackgroundHover },
      }}
      onContextMenu={e => {
        if (!contextMenusEnabled) return;
        if (minimal) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setCrossOffset(e.clientX - rect.left);
        setOffset(e.clientY - rect.bottom);
        setOpen('contextMenu');
      }}
    >
      {!minimal && (
        <Popover
          triggerRef={open === 'contextMenu' ? rowRef : buttonRef}
          isOpen={!!open}
          onOpenChange={() => setOpen(false)}
          isNonModal
          placement="bottom start"
          crossOffset={open === 'contextMenu' ? crossOffset : 0}
          offset={open === 'contextMenu' ? offset : 0}
          style={{ margin: 1 }}
        >
          <OverflowMenu
            schedule={schedule}
            status={statuses.get(schedule.id)}
            onAction={(action, id) => {
              onAction(action, id);
              setOpen(false);
            }}
          />
        </Popover>
      )}
      <Field width="flex" name="name">
        <Text
          style={
            schedule.name == null
              ? { color: theme.buttonNormalDisabledText }
              : null
          }
          title={schedule.name ? schedule.name : ''}
        >
          {schedule.name ? schedule.name : t('None')}
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
            <SvgCheck style={{ width: 13, height: 13 }} />
          )}
        </Field>
      )}
      {!minimal && (
        <Field width={40} name="actions">
          <View>
            <Button
              ref={buttonRef}
              variant="bare"
              aria-label={t('Menu')}
              onPress={() => {
                setOpen('button');
              }}
            >
              <SvgDotsHorizontalTriple
                width={15}
                height={15}
                style={{ transform: 'rotateZ(90deg)' }}
              />
            </Button>
          </View>
        </Field>
      )}
    </Row>
  );
}

export function SchedulesTable({
  isLoading = false,
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
  const { t } = useTranslation();

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [showCompleted, setShowCompleted] = useState(false);

  const payees = usePayees();
  const accounts = useAccounts();

  const filteredSchedules = useMemo(() => {
    if (!filter) {
      return schedules;
    }
    const filterIncludes = (str: string) =>
      str
        ? getNormalisedString(str).includes(getNormalisedString(filter)) ||
          getNormalisedString(filter).includes(getNormalisedString(str))
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
  }, [payees, accounts, schedules, filter, statuses]);

  const items: readonly SchedulesTableItem[] = useMemo(() => {
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
            <Trans>Show completed schedules</Trans>
          </Field>
        </Row>
      );
    }
    return (
      <ScheduleRow
        schedule={item as ScheduleEntity}
        {...{ statuses, dateFormat, onSelect, onAction, minimal }}
      />
    );
  }

  return (
    <View style={{ flex: 1, ...tableStyle }}>
      <TableHeader height={ROW_HEIGHT} inset={15}>
        <Field width="flex">
          <Trans>Name</Trans>
        </Field>
        <Field width="flex">
          <Trans>Payee</Trans>
        </Field>
        <Field width="flex">
          <Trans>Account</Trans>
        </Field>
        <Field width={110}>
          <Trans>Next date</Trans>
        </Field>
        <Field width={120}>
          <Trans>Status</Trans>
        </Field>
        <Field width={100} style={{ textAlign: 'right' }}>
          <Trans>Amount</Trans>
        </Field>
        {!minimal && (
          <Field width={80} style={{ textAlign: 'center' }}>
            <Trans>Recurring</Trans>
          </Field>
        )}
        {!minimal && <Field width={40} />}
      </TableHeader>
      <Table
        loading={isLoading}
        rowHeight={ROW_HEIGHT}
        backgroundColor="transparent"
        style={{ flex: 1, backgroundColor: 'transparent', ...style }}
        items={items as ScheduleEntity[]}
        renderItem={renderItem}
        renderEmpty={filter ? t('No matching schedules') : t('No schedules')}
      />
    </View>
  );
}
