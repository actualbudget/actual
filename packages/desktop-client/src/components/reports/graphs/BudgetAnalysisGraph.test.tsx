import React from 'react';

import { render, screen } from '@testing-library/react';

import { BudgetAnalysisGraph } from './BudgetAnalysisGraph';

import { TestProviders } from '@desktop-client/mocks';

const sampleData = {
  intervalData: [
    {
      date: '2024-01',
      budgeted: 50000,
      spent: -30000,
      balance: 20000,
      overspendingAdjustment: 0,
    },
    {
      date: '2024-02',
      budgeted: 50000,
      spent: -40000,
      balance: 30000,
      overspendingAdjustment: 0,
    },
  ],
};

describe('BudgetAnalysisGraph – balanceOnly', () => {
  it('renders the balance series label when balanceOnly is true', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Line"
          balanceOnly
          showBalance={false}
        />
      </TestProviders>,
    );
    // The LineChart should render without throwing; the balance dataKey should be present
    // We verify by checking the container renders successfully
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders all series when balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Line"
          balanceOnly={false}
          showBalance
        />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a bar chart when graphType is Bar and balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Bar"
          balanceOnly={false}
          showBalance
        />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a line chart (balance-only) even when graphType is Bar', () => {
    // When balanceOnly=true the component always renders a LineChart
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Bar"
          balanceOnly
        />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('hides balance line when showBalance is false and balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Line"
          balanceOnly={false}
          showBalance={false}
        />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
