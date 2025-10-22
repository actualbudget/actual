import React from 'react';
import { Route, Routes } from 'react-router';

import { Overview } from './Overview';
import { Calendar } from './reports/Calendar';
import { CashFlow } from './reports/CashFlow';
import { CustomReport } from './reports/CustomReport';
import { Formula } from './reports/Formula';
import { NetWorth } from './reports/NetWorth';
import { Spending } from './reports/Spending';
import { Summary } from './reports/Summary';

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
      <Route path="/formula" element={<Formula />} />
      <Route path="/formula/:id" element={<Formula />} />
    </Routes>
  );
}
