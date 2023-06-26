import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { View } from '../common';

import CashFlow from './CashFlow';
import NetWorth from './NetWorth';
import Overview from './Overview';

export default function Reports() {
  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/net-worth" element={<NetWorth />} />
        <Route path="/cash-flow" element={<CashFlow />} />
      </Routes>
    </View>
  );
}
