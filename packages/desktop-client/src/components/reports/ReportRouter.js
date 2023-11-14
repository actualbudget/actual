import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Overview from './Overview';
import CashFlow from './reports/CashFlow';
import CategorySpending from './reports/CategorySpending';
import Custom from './reports/Custom';
import NetWorth from './reports/NetWorth';
import Sankey from './Sankey';

export function ReportRouter() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/net-worth" element={<NetWorth />} />
      <Route path="/cash-flow" element={<CashFlow />} />
      <Route path="/category-spending" element={<CategorySpending />} />
      <Route path="/custom" element={<Custom />} />
      <Route path="/sankey" element={<Sankey />} />
    </Routes>
  );
}
