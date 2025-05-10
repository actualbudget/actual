import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { Overview } from '@desktop-client/components/reports/Overview';
import { Calendar } from '@desktop-client/components/reports/reports/Calendar';
import { CashFlow } from '@desktop-client/components/reports/reports/CashFlow';
import { CustomReport } from '@desktop-client/components/reports/reports/CustomReport';
import { NetWorth } from '@desktop-client/components/reports/reports/NetWorth';
import { Spending } from '@desktop-client/components/reports/reports/Spending';
import { Summary } from '@desktop-client/components/reports/reports/Summary';

export function ReportRouter() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/net-worth" element={<NetWorth />} />
      <Route path="/net-worth/:id" element={<NetWorth />} />
      <Route path="/cash-flow" element={<CashFlow />} />
      <Route path="/cash-flow/:id" element={<CashFlow />} />
      <Route path="/custom" element={<CustomReport />} />
      <Route path="/custom/:id" element={<CustomReport />} />
      <Route path="/spending" element={<Spending />} />
      <Route path="/spending/:id" element={<Spending />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/summary/:id" element={<Summary />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/calendar/:id" element={<Calendar />} />
    </Routes>
  );
}
