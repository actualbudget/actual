import React from 'react';
import { Route, Routes } from 'react-router';

import { BudgetAnalysis } from './reports/BudgetAnalysis';
import { Calendar } from './reports/Calendar';
import { CashFlow } from './reports/CashFlow';
import { Crossover } from './reports/Crossover';
import { CustomReport } from './reports/CustomReport';
import { Formula } from './reports/Formula';
import { NetWorth } from './reports/NetWorth';
import { Spending } from './reports/Spending';
import { Summary } from './reports/Summary';
import { ReportsDashboardRouter } from './ReportsDashboardRouter';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

export function ReportRouter() {
  const crossoverReportEnabled = useFeatureFlag('crossoverReport');
  const budgetAnalysisReportEnabled = useFeatureFlag('budgetAnalysisReport');

  return (
    <Routes>
      <Route path="/" element={<ReportsDashboardRouter />} />
      <Route path="/:dashboardId" element={<ReportsDashboardRouter />} />
      <Route path="/net-worth" element={<NetWorth />} />
      <Route path="/net-worth/:id" element={<NetWorth />} />
      {crossoverReportEnabled && (
        <>
          <Route path="/crossover" element={<Crossover />} />
          <Route path="/crossover/:id" element={<Crossover />} />
        </>
      )}
      <Route path="/cash-flow" element={<CashFlow />} />
      <Route path="/cash-flow/:id" element={<CashFlow />} />
      <Route path="/custom" element={<CustomReport />} />
      <Route path="/custom/:id" element={<CustomReport />} />
      <Route path="/spending" element={<Spending />} />
      <Route path="/spending/:id" element={<Spending />} />
      {budgetAnalysisReportEnabled && (
        <>
          <Route path="/budget-analysis" element={<BudgetAnalysis />} />
          <Route path="/budget-analysis/:id" element={<BudgetAnalysis />} />
        </>
      )}
      <Route path="/summary" element={<Summary />} />
      <Route path="/summary/:id" element={<Summary />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/calendar/:id" element={<Calendar />} />
      <Route path="/formula" element={<Formula />} />
      <Route path="/formula/:id" element={<Formula />} />
    </Routes>
  );
}
