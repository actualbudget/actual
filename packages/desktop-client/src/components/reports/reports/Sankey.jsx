import React, { useState, useEffect, useMemo } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { theme, styles } from '../../../style';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';
import { SankeyGraph } from '../graphs/SankeyGraph';
import { Header } from '../Header';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/sankey-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function Sankey() {
  const { grouped: categoryGroups } = useCategories();
  const {
    filters,
    saved,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters();

  const [allMonths, setAllMonths] = useState(null);
  const [start, setStart] = useState(
    monthUtils.subMonths(monthUtils.currentMonth(), 5),
  );
  const [end, setEnd] = useState(monthUtils.currentMonth());

  const params = useMemo(
    () => sankeySpreadsheet(start, end, categoryGroups, filters, conditionsOp),
    [start, end, categoryGroups, filters, conditionsOp],
  );
  const data = useReport('sankey', params);
  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, []);

  function onChangeDates(start, end) {
    setStart(start);
    setEnd(end);
  }

  if (!allMonths || !data) {
    return null;
  }

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <Header
        title="Sankey"
        allMonths={allMonths}
        start={start}
        end={end}
        onChangeDates={onChangeDates}
        filters={filters}
        saved={saved}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onCondOpChange={onCondOpChange}
      />

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 30,
          paddingTop: 0,
          overflow: 'auto',
          flexGrow: 1,
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
            paddingRight: 20,
            flexShrink: 0,
          }}
        >
          <View
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
          />
        </View>

        <SankeyGraph style={{ flexGrow: 1 }} data={data} />

        <View style={{ marginTop: 30 }}>
          <Paragraph>
            <strong>What is a Sankey plot?</strong>
          </Paragraph>
          <Paragraph>
            A Sankey plot visualizes the flow of quantities between multiple
            categories, emphasizing the distribution and proportional
            relationships of data streams. If you hover over the graph, you can
            see detailed flow values between categories.
          </Paragraph>
        </View>
      </View>
    </View>
  );
}
