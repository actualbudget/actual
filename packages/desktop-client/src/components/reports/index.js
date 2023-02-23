import React from 'react';
import { Route } from 'react-router-dom';

import { View } from 'loot-design/src/components/common';

import CashFlow from './CashFlow';
import NetWorth from './NetWorth';
import Overview from './Overview';
import Spending from './Spending';

class Reports extends React.Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Route path="/reports" exact component={Overview} />
        <Route path="/reports/net-worth" exact component={NetWorth} />
        <Route path="/reports/cash-flow" exact component={CashFlow} />
        <Route path="/reports/spending" exact component={Spending} />
      </View>
    );
  }
}

export default Reports;
