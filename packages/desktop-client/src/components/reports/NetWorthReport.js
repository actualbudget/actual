import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { View, P } from 'loot-design/src/components/common';
import { styles } from 'loot-design/src/style';

import Change from './Change';
import LineGraph from './graphs/LineGraph';

function NetWorthReport({ start, end, graphData, totalChanges, netWorth }) {
  let endMo = monthUtils.getMonth(end);

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
          <View style={{ textAlign: 'right', paddingRight: 20, flexShrink: 0 }}>
            <View
              style={[styles.largeText, { fontWeight: 400, marginBottom: 5 }]}
            >
              {integerToCurrency(netWorth)}
            </View>
            <Change amount={totalChanges} />
          </View>
          <LineGraph
            start={monthUtils.getMonth(start)}
            end={endMo}
            graphData={graphData}
          />
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <P>
          <strong>How is net worth calculated?</strong>
        </P>
        <P>
          Net worth shows the balance of all accounts over time, including all
          of your investments. Your "net worth" is considered to be the amount
          you'd have if you sold all your assets and paid off as much debt as
          possible. If you hover over the graph, you can also see the amount of
          assets and debt individually.
        </P>
      </View>
    </View>
  );
}

export default NetWorthReport;
