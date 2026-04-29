import React from 'react';
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

  return (
    <Routes>
      <Route path="/" element={<ReportsDashboardRouter />} />
      <Route path="/:dashboardId" element={<ReportsDashboardRouter />} />
      <Route
        path="/net-worth"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <NetWorth />
          </ErrorBoundary>
        }
      />
      <Route
        path="/net-worth/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <NetWorth />
          </ErrorBoundary>
        }
      />
      {crossoverReportEnabled && (
        <>
          <Route
            path="/crossover"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <Crossover />
              </ErrorBoundary>
            }
          />
          <Route
            path="/crossover/:id"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <Crossover />
              </ErrorBoundary>
            }
          />
        </>
      )}
      {ageOfMoneyReportEnabled && (
        <>
          <Route
            path="/age-of-money"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <AgeOfMoney />
              </ErrorBoundary>
            }
          />
          <Route
            path="/age-of-money/:id"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <AgeOfMoney />
              </ErrorBoundary>
            }
          />
        </>
      )}
      <Route
        path="/cash-flow"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <CashFlow />
          </ErrorBoundary>
        }
      />
      <Route
        path="/cash-flow/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <CashFlow />
          </ErrorBoundary>
        }
      />
      <Route
        path="/custom"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <CustomReport />
          </ErrorBoundary>
        }
      />
      <Route
        path="/custom/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <CustomReport />
          </ErrorBoundary>
        }
      />
      <Route
        path="/spending"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Spending />
          </ErrorBoundary>
        }
      />
      <Route
        path="/spending/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Spending />
          </ErrorBoundary>
        }
      />
      {budgetAnalysisReportEnabled && (
        <>
          <Route
            path="/budget-analysis"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <BudgetAnalysis />
              </ErrorBoundary>
            }
          />
          <Route
            path="/budget-analysis/:id"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <BudgetAnalysis />
              </ErrorBoundary>
            }
          />
        </>
      )}
      <Route
        path="/summary"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Summary />
          </ErrorBoundary>
        }
      />
      <Route
        path="/summary/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Summary />
          </ErrorBoundary>
        }
      />
      <Route
        path="/calendar"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Calendar />
          </ErrorBoundary>
        }
      />
      <Route
        path="/calendar/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Calendar />
          </ErrorBoundary>
        }
      />
      <Route
        path="/formula"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Formula />
          </ErrorBoundary>
        }
      />
      <Route
        path="/formula/:id"
        element={
          <ErrorBoundary
            FallbackComponent={FeatureErrorFallback}
            resetKeys={[location.pathname]}
          >
            <Formula />
          </ErrorBoundary>
        }
      />
      {sankeyReportEnabled && (
        <>
          <Route
            path="/sankey"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <Sankey />
              </ErrorBoundary>
            }
          />
          <Route
            path="/sankey/:id"
            element={
              <ErrorBoundary
                FallbackComponent={FeatureErrorFallback}
                resetKeys={[location.pathname]}
              >
                <Sankey />
              </ErrorBoundary>
            }
          />
        </>
      )}
    </Routes>
  );
}
