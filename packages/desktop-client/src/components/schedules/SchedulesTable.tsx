// @ts-strict-ignore
import React, { useRef, useState, useMemo, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { SvgCheck } from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { format as monthUtilFormat } from 'loot-core/shared/months';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { getScheduledAmount } from 'loot-core/shared/schedules';
import { type ScheduleEntity } from 'loot-core/types/models';

import { StatusBadge } from './StatusBadge';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import {
  Table,
  TableHeader,
  Row,
  Field,
  Cell,
} from '@desktop-client/components/table';
import { DisplayId } from '@desktop-client/components/util/DisplayId';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePayees } from '@desktop-client/hooks/usePayees';
import {
  type ScheduleStatusType,
  type ScheduleStatuses,
} from '@desktop-client/hooks/useSchedules';

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
  | 'post-transaction-today'
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

    menuItems.push(
      {
        name: 'post-transaction',
        text: t('Post transaction'),
      },
      {
        name: 'post-transaction-today',
        text: t('Post transaction today'),
      },
    );

    if (status === 'completed') {
      menuItems.push({
        name: 'restart',
        text: t('Restart'),
      });
    } else {
      menuItems.push(
        {
          name: 'skip',
          text: t('Skip next scheduled date'),
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
  const format = useFormat();

  const num = getScheduledAmount(amount);
  const currencyAmount = format(Math.abs(num || 0), 'financial');
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
}: {
  schedule: ScheduleEntity;
  dateFormat: string;
} & Pick<
  SchedulesTableProps,
  'onSelect' | 'onAction' | 'minimal' | 'statuses'
>) {
  const { t } = useTranslation();

  const rowRef = useRef(null);
  const buttonRef = useRef(null);
  const {
    setMenuOpen,
    menuOpen,
    handleContextMenu,
    resetPosition,
    position,
    asContextMenu,
  } = useContextMenu();

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
      onContextMenu={handleContextMenu}
    >
      {!minimal && (
        <Popover
          triggerRef={asContextMenu ? rowRef : buttonRef}
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          isNonModal
          placement="bottom start"
          {...position}
          style={{ margin: 1 }}
        >
          <OverflowMenu
            schedule={schedule}
            status={statuses.get(schedule.id)}
            onAction={(action, id) => {
              onAction(action, id);
              resetPosition();
              setMenuOpen(false);
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
          {schedule._date &&
            typeof schedule._date === 'object' &&
            schedule._date.frequency && (
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
                resetPosition();
                setMenuOpen(true);
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
  isLoading,
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
  const format = useFormat();

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
        format(Math.abs(amount || 0), 'financial');
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
