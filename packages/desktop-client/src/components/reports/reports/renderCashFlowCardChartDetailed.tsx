// @ts-strict-ignore
import React from 'react';

import { CashFlowGraph } from '../graphs/CashFlowGraph';

export const renderCashFlowCardChartDetailed = (
  graphData: {
    expenses: { x: Date; y: number }[];
    income: { x: Date; y: number }[];
    balances: { x: Date; y: number }[];
    transfers: { x: Date; y: number }[];
  },
  isConcise: boolean,
) => {
  return (
    <CashFlowGraph
      graphData={graphData}
      isConcise={isConcise}
      showBalance={true}
    />
  );
};
