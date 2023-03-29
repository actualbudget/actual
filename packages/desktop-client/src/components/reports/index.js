import React from 'react';
import { Route } from 'react-router-dom';

import { View } from '../common';

import CashFlow from './CashFlow';
import NetWorth from './NetWorth';
import Overview from './Overview';

export default function Reports() {
  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <Route path="/reports" exact component={Overview} />
      <Route path="/reports/net-worth" exact component={NetWorth} />
      <Route path="/reports/cash-flow" exact component={CashFlow} />
    </View>
  );
}
