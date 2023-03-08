import React from 'react';
import { Route } from 'react-router-dom';

import { View } from 'loot-design/src/components/common';

import CashFlow from './CashFlow';
import NetWorth from './NetWorth';
import Overview from './Overview';
import AllReports from './Reports';

class Reports extends React.Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Route path="/reports/overview" exact component={Overview} />
        <Route path="/reports" exact component={AllReports} />
        <Route path="/reports/net-worth" exact component={NetWorth} />
        <Route path="/reports/cash-flow" exact component={CashFlow} />
      </View>
    );
  }
}

export default Reports;
