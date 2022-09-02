import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';

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
import { useTranslation } from 'react-i18next';

export let ROW_HEIGHT = 43;

function OverflowMenu({ schedule, status, onAction }) {
  let [open, setOpen] = useState(false);

  const { t } = useTranslation();

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
                text: t('schedules.postTransaction')
              },
              ...(schedule.completed
                ? [{ name: 'restart', text: t('general.restart') }]
                : [
                    { name: 'skip', text: t('schedules.skipNextDate') },
                    { name: 'complete', text: t('general.complete') }
                  ]),
              { name: 'delete', text: t('general.delete') }
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

  const { t } = useTranslation();

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
          title={t('general.approximatelyWithAmount', { amount: str })}
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
        title={
          isApprox ? t('general.approximatelyWithAmount', { amount: str }) : str
        }
      >
        {num > 0 ? `+${str}` : `${str}`}
      </Text>
    </Cell>
  );
}

export function SchedulesTable({
  schedules,
  statuses,
  minimal,
  allowCompleted,
  style,
  onSelect,
  onAction
}) {
  let dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

  let [showCompleted, setShowCompleted] = useState(false);

  const { t } = useTranslation();

  let items = useMemo(() => {
    if (!allowCompleted) {
      return schedules.filter(s => !s.completed);
    }
    if (showCompleted) {
      return schedules;
    }
    let arr = schedules.filter(s => !s.completed);
    if (schedules.find(s => s.completed)) {
      arr.push({ type: 'show-completed' });
    }
    return arr;
  }, [schedules, showCompleted, allowCompleted]);

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
            {t('schedules.showCompletedSchedules')}
          </Field>
        </Row>
      );
    }
    return renderSchedule({ item });
  }

  return (
    <>
      <TableHeader height={ROW_HEIGHT} inset={15} version="v2">
        <Field width="flex">{t('general.payee')}</Field>
        <Field width="flex">{t('general.account_one')}</Field>
        <Field width={110}>{t('schedules.nextDate')}</Field>
        <Field width={120}>{t('general.status')}</Field>
        <Field width={100} style={{ textAlign: 'right' }}>
          {t('general.amount')}
        </Field>
        {!minimal && (
          <Field width={80} style={{ textAlign: 'center' }}>
            {t('general.recurring')}
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
        renderEmpty={t('schedules.noSchedules')}
        allowPopupsEscape={items.length < 6}
      />
    </>
  );
}
