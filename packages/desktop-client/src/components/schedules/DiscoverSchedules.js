import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';

import useSelected, {
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider,
} from '../../hooks/useSelected';
import useSendPlatformRequest from '../../hooks/useSendPlatformRequest';
import { colors, styles } from '../../style';
import { getParent } from '../../util/router-tools';
import { View, Stack, ButtonWithLoading, P } from '../common';
import { Page, usePageType } from '../Page';
import { Table, TableHeader, Row, Field, SelectCell } from '../table';
import DisplayId from '../util/DisplayId';

import { ScheduleAmountCell } from './SchedulesTable';

let ROW_HEIGHT = 43;

function DiscoverSchedulesTable({ schedules, loading }) {
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();

  function renderItem({ item }) {
    let selected = selectedItems.has(item.id);
    let amountOp = item._conditions.find(c => c.field === 'amount').op;
    let recurDescription = getRecurringDescription(item.date);

    return (
      <Row
        height={ROW_HEIGHT}
        inset={15}
        onClick={e => {
          dispatchSelected({ type: 'select', id: item.id, event: e });
        }}
        style={{
          borderColor: selected
            ? colors.tableBorderSelected
            : colors.tableBorder,
          cursor: 'pointer',
          color: selected
            ? colors.tableRowBackgroundHighlightText
            : colors.tableText,
          backgroundColor: selected
            ? colors.tableRowBackgroundHighlight
            : colors.tableBackground,
          ':hover': {
            backgroundColor: colors.tableRowBackgroundHover,
            color: colors.tableText,
          },
        }}
      >
        <SelectCell
          exposed={true}
          focused={false}
          selected={selected}
          onSelect={e => {
            dispatchSelected({ type: 'select', id: item.id, event: e });
          }}
        />
        <Field width="flex">
          <DisplayId type="payees" id={item.payee} />
        </Field>
        <Field width="flex">
          <DisplayId type="accounts" id={item.account} />
        </Field>
        <Field width="auto" title={recurDescription} style={{ flex: 1.5 }}>
          {recurDescription}
        </Field>
        <ScheduleAmountCell amount={item.amount} op={amountOp} />
      </Row>
    );
  }

  return (
    <View style={{ flex: 1, boxShadow: styles.cardShadow }}>
      <TableHeader height={ROW_HEIGHT} inset={15}>
        <SelectCell
          exposed={!loading}
          focused={false}
          selected={selectedItems.size > 0}
          onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
        />
        <Field width="flex">Payee</Field>
        <Field width="flex">Account</Field>
        <Field width="auto" style={{ flex: 1.5 }}>
          When
        </Field>
        <Field width={100} style={{ textAlign: 'right' }}>
          Amount
        </Field>
      </TableHeader>
      <Table
        rowHeight={ROW_HEIGHT}
        style={{
          flex: 1,
        }}
        items={schedules}
        loading={loading}
        isSelected={id => selectedItems.has(id)}
        renderItem={renderItem}
        renderEmpty="No schedules found"
      />
    </View>
  );
}

export default function DiscoverSchedules() {
  let pageType = usePageType();
  let navigate = useNavigate();
  let { data: schedules, isLoading } =
    useSendPlatformRequest('schedule/discover');
  if (!schedules) schedules = [];

  let [creating, setCreating] = useState(false);

  let selectedInst = useSelected('discover-schedules', schedules, []);

  let location = useLocation();
  if (!getParent(location)) {
    return <Navigate to="/schedules" replace />;
  }

  async function onCreate() {
    let selected = schedules.filter(s => selectedInst.items.has(s.id));
    setCreating(true);

    for (let schedule of selected) {
      let scheduleId = await send('schedule/create', {
        conditions: schedule._conditions,
      });

      // Now query for matching transactions and link them automatically
      let { filters } = await send('make-filters-from-conditions', {
        conditions: schedule._conditions,
      });

      if (filters.length > 0) {
        let { data: transactions } = await runQuery(
          q('transactions').filter({ $and: filters }).select('id'),
        );
        await send('transactions-batch-update', {
          updated: transactions.map(t => ({
            id: t.id,
            schedule: scheduleId,
          })),
        });
      }
    }

    setCreating(false);
    navigate(-1);
  }

  return (
    <Page title="Found schedules" modalSize={{ width: 850, height: 650 }}>
      <View style={{ color: colors.pageText }}>
        <P>
          We found some possible schedules in your current transactions. Select
          the ones you want to create.
        </P>
        <P>
          If you expected a schedule here and don’t see it, it might be because
          the payees of the transactions don’t match. Make sure you rename
          payees on all transactions for a schedule to be the same payee.
        </P>

        <SelectedProvider instance={selectedInst}>
          <DiscoverSchedulesTable loading={isLoading} schedules={schedules} />
        </SelectedProvider>

        <Stack
          direction="row"
          align="center"
          justify="flex-end"
          style={{
            paddingTop: 20,
            paddingBottom: pageType.type === 'modal' ? 0 : 20,
          }}
        >
          <ButtonWithLoading
            primary
            loading={creating}
            disabled={selectedInst.items.size === 0}
            onClick={onCreate}
          >
            Create schedules
          </ButtonWithLoading>
        </Stack>
      </View>
    </Page>
  );
}
