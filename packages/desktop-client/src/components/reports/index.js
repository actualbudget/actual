import React from 'react';
import { Route } from 'react-router-dom';

import { View } from '../common';

import CashFlow from './CashFlow';
import NetWorth from './NetWorth';
import Overview from './Overview';

export default function Reports() {
  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <Route path="/reports" exact>
        <Overview />
      </Route>
      <Route path="/reports/net-worth" exact>
        <NetWorth />
      </Route>
      <Route path="/reports/cash-flow" exact>
        <CashFlow />
      </Route>
    </View>
  );
}
