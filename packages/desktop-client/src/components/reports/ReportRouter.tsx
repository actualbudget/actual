import type { ReactElement } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Route, Routes, useLocation } from 'react-router';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useFeatureFlag } from '#hooks/useFeatureFlag';

import { AgeOfMoney } from './reports/AgeOfMoney';
import { BudgetAnalysis } from './reports/BudgetAnalysis';
import { Calendar } from './reports/Calendar';
import { CashFlow } from './reports/CashFlow';
import { Crossover } from './reports/Crossover';
import { CustomReport } from './reports/CustomReport';
import { Formula } from './reports/Formula';
import { NetWorth } from './reports/NetWorth';
import { Sankey } from './reports/Sankey';
import { Spending } from './reports/Spending';
import { Summary } from './reports/Summary';
import { ReportsDashboardRouter } from './ReportsDashboardRouter';

export function ReportRouter() {
  const location = useLocation();
  const crossoverReportEnabled = useFeatureFlag('crossoverReport');
  const ageOfMoneyReportEnabled = useFeatureFlag('ageOfMoneyReport');
  const budgetAnalysisReportEnabled = useFeatureFlag('budgetAnalysisReport');
  const sankeyReportEnabled = useFeatureFlag('sankeyReport');

  function withReportBoundary(element: ReactElement) {
    return (
      <ErrorBoundary
        FallbackComponent={FeatureErrorFallback}
        resetKeys={[location.pathname]}
      >
        {element}
      </ErrorBoundary>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ReportsDashboardRouter />} />
      <Route path="/:dashboardId" element={<ReportsDashboardRouter />} />
      <Route path="/net-worth" element={withReportBoundary(<NetWorth />)} />
      <Route path="/net-worth/:id" element={withReportBoundary(<NetWorth />)} />
      {crossoverReportEnabled && (
        <>
          <Route
            path="/crossover"
            element={withReportBoundary(<Crossover />)}
          />
          <Route
            path="/crossover/:id"
            element={withReportBoundary(<Crossover />)}
          />
        </>
      )}
      {ageOfMoneyReportEnabled && (
        <>
          <Route
            path="/age-of-money"
            element={withReportBoundary(<AgeOfMoney />)}
          />
          <Route
            path="/age-of-money/:id"
            element={withReportBoundary(<AgeOfMoney />)}
          />
        </>
      )}
      <Route path="/cash-flow" element={withReportBoundary(<CashFlow />)} />
      <Route path="/cash-flow/:id" element={withReportBoundary(<CashFlow />)} />
      <Route path="/custom" element={withReportBoundary(<CustomReport />)} />
      <Route
        path="/custom/:id"
        element={withReportBoundary(<CustomReport />)}
      />
      <Route path="/spending" element={withReportBoundary(<Spending />)} />
      <Route path="/spending/:id" element={withReportBoundary(<Spending />)} />
      {budgetAnalysisReportEnabled && (
        <>
          <Route
            path="/budget-analysis"
            element={withReportBoundary(<BudgetAnalysis />)}
          />
          <Route
            path="/budget-analysis/:id"
            element={withReportBoundary(<BudgetAnalysis />)}
          />
        </>
      )}
      <Route path="/summary" element={withReportBoundary(<Summary />)} />
      <Route path="/summary/:id" element={withReportBoundary(<Summary />)} />
      <Route path="/calendar" element={withReportBoundary(<Calendar />)} />
      <Route path="/calendar/:id" element={withReportBoundary(<Calendar />)} />
      <Route path="/formula" element={withReportBoundary(<Formula />)} />
      <Route path="/formula/:id" element={withReportBoundary(<Formula />)} />
      {sankeyReportEnabled && (
        <>
          <Route path="/sankey" element={withReportBoundary(<Sankey />)} />
          <Route path="/sankey/:id" element={withReportBoundary(<Sankey />)} />
        </>
      )}
    </Routes>
  );
}
