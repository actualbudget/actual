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

  describe('amount conversion', () => {
    it('converts dollar amounts to cents for display', () => {
      renderComponent({
        type: 'simple',
        directive: 'template',
        priority: 1,
        monthly: 100,
      });

      expect(screen.getByText(/100\.00/)).toBeInTheDocument();
    });

    it('displays decimal amounts correctly', () => {
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
