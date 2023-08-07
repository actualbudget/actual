import React from 'react';
import { Route, Routes } from 'react-router-dom';

import CashFlow from './CashFlow';
import CategorySpending from './CategorySpending';
import NetWorth from './NetWorth';
import Overview from './Overview';

export function ReportRouter() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/net-worth" element={<NetWorth />} />
      <Route path="/cash-flow" element={<CashFlow />} />
      <Route path="/category-spending" element={<CategorySpending />} />
    </Routes>
  );
}
