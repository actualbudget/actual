import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { Overview } from './Overview';
import { CashFlow } from './reports/CashFlow';
import { CategorySpending } from './reports/CategorySpending';
import { CustomReport } from './reports/CustomReport';
import { NetWorth } from './reports/NetWorth';
import { Sankey } from './reports/Sankey';

export function ReportRouter() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/net-worth" element={<NetWorth />} />
      <Route path="/cash-flow" element={<CashFlow />} />
      <Route path="/category-spending" element={<CategorySpending />} />
      <Route path="/custom" element={<CustomReport />} />
      <Route path="/sankey" element={<Sankey />} />
    </Routes>
  );
}
