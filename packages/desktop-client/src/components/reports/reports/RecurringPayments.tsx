import React from 'react';
import { RecurringPaymentsGraph } from '../graphs/RecurringPaymentsGraph';

function RecurringPaymentsComponent() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Recurring Payments</h1>
      <RecurringPaymentsGraph />
    </div>
  );
}

export default RecurringPaymentsComponent;
export { RecurringPaymentsComponent as RecurringPayments };