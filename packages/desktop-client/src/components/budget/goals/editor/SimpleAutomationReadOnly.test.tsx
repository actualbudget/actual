import React from 'react';
import { Provider } from 'react-redux';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SimpleAutomationReadOnly } from './SimpleAutomationReadOnly';

import { store } from '@desktop-client/redux/store';

describe('SimpleAutomationReadOnly', () => {
  const renderComponent = (
    template: Parameters<typeof SimpleAutomationReadOnly>[0]['template'],
  ) => {
    return render(
      <Provider store={store}>
        <SimpleAutomationReadOnly template={template} />
      </Provider>,
    );
  };

  describe('Bug 3: Dollar to cents conversion', () => {
    it('displays $100.00 when monthly is 100 (dollars)', () => {
      renderComponent({
        type: 'simple',
        directive: 'template',
        priority: 1,
        monthly: 100, // Parser stores this as dollars
      });

      // BUG: Currently shows $1.00 because it treats 100 as cents
      // Should show $100.00
      expect(screen.getByText(/100\.00/)).toBeInTheDocument();
    });

    it('displays $50.25 when monthly is 50.25 (dollars)', () => {
      renderComponent({
        type: 'simple',
        directive: 'template',
        priority: 1,
        monthly: 50.25,
      });

      expect(screen.getByText(/50\.25/)).toBeInTheDocument();
    });

    it('displays $0.00 when monthly is 0', () => {
      renderComponent({
        type: 'simple',
        directive: 'template',
        priority: 1,
        monthly: 0,
      });

      expect(screen.getByText(/0\.00/)).toBeInTheDocument();
    });

    it('displays $0.00 when monthly is undefined', () => {
      renderComponent({
        type: 'simple',
        directive: 'template',
        priority: 1,
        monthly: undefined,
      });

      expect(screen.getByText(/0\.00/)).toBeInTheDocument();
    });
  });
});
