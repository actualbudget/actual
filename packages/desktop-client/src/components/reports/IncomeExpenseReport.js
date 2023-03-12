import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { View, Select, P } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import ChartBar from 'loot-design/src/svg/v1/ChartBar';
import ChartPie from 'loot-design/src/svg/v1/ChartPie';

import { ChartExtraColumn } from './Charts';
import BarGraph from './graphs/BarGraph';
import DonutGraph from './graphs/DonutGraph';
import { TotalsTrends } from './Header';

function IncomeExpenseReport({
  start,
  end,
  totalIncome,
  totalExpenses,
  graphData,
  secondaryReport,
  catData,
  selectList,
  onSecondaryClick,
  handleChange,
}) {
  let endMo = monthUtils.getMonth(end);

  function ChooseChart({
    secondaryReport,
    start,
    endMo,
    catData,
    graphData,
    selectList,
  }) {
    if (secondaryReport === 'Totals') {
      return (
        <View style={{ alignItems: 'center' }}>
          <DonutGraph
            start={monthUtils.getMonth(start)}
            end={endMo}
            graphData={
              selectList === 'Expense' ? catData.expenses : catData.income
            }
          />
        </View>
      );
    } else {
      return (
        <View>
          <BarGraph
            start={start}
            end={endMo}
            graphDataExp={
              selectList === 'All' ? graphData.expenses : graphData.change
            }
            graphDataInc={selectList === 'All' && graphData.income}
            selectList={selectList}
          />
        </View>
      );
    }
  }

  return (
    <View
      style={{
        backgroundColor: 'white',
        paddingLeft: 30,
        paddingRight: 30,
        overflow: 'auto',
      }}
    >
      <View
        style={{
          flexShrink: 0,
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingTop: 0,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            overflow: 'auto',
            flexGrow: 1,
            padding: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
            }}
          >
            <TotalsTrends
              title="Totals"
              id="Totals"
              secondaryReport={secondaryReport}
              Chart={ChartPie}
              onSecondaryClick={onSecondaryClick}
            />
            <TotalsTrends
              title="Trends"
              id="Trends"
              secondaryReport={secondaryReport}
              Chart={ChartBar}
              onSecondaryClick={onSecondaryClick}
            />
            <View
              style={{
                color: colors.n3,
                alignItems: 'center',
                height: 16,
                marginLeft: 20,
                marginTop: -2,
              }}
            >
              <Select
                style={{ flex: 0, backgroundColor: 'white' }}
                value={selectList}
                onChange={e => handleChange(e.target.value)}
              >
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                {secondaryReport === 'Trends' && (
                  <option value="All">All</option>
                )}
              </Select>
            </View>
          </View>

          <ChooseChart
            start={start}
            endMo={endMo}
            graphData={graphData}
            catData={catData}
            selectList={selectList}
            secondaryReport={secondaryReport}
          />
        </View>
        <ChartExtraColumn
          start={start}
          end={endMo}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          selectList={selectList}
        />
      </View>
      <View style={{ marginTop: 10 }}>
        <P>
          <strong>How are income and expenses calculated?</strong>
        </P>
        <P>
          These charts show your income/expenses as a total or over time and is
          based on your filters. This allows you to look at accounts or payees
          or categories and track money spent in any way you like.
        </P>
      </View>
    </View>
  );
}

export default IncomeExpenseReport;
