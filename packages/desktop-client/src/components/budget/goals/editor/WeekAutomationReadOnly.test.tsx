import React from 'react';
import { Provider } from 'react-redux';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { WeekAutomationReadOnly } from './WeekAutomationReadOnly';

import { store } from '@desktop-client/redux/store';

describe('WeekAutomationReadOnly', () => {
  const renderComponent = (
    template: Parameters<typeof WeekAutomationReadOnly>[0]['template'],
  ) => {
    return render(
      <Provider store={store}>
        <WeekAutomationReadOnly template={template} />
      </Provider>,
    );
  };

  describe('Bug 1: Period display', () => {
    it('displays "every 2 weeks" for biweekly template', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 100,
        period: { period: 'week', amount: 2 },
        starting: '2025-01-01',
      });

      // BUG: Currently shows "each week" instead of "every 2 weeks"
      expect(screen.getByText(/every 2 weeks/i)).toBeInTheDocument();
    });

    it('displays "every 3 months" for quarterly template', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 500,
        period: { period: 'month', amount: 3 },
        starting: '2025-01-01',
      });

      expect(screen.getByText(/every 3 months/i)).toBeInTheDocument();
    });

    it('displays "every week" for weekly template (amount=1)', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 50,
        period: { period: 'week', amount: 1 },
        starting: '2025-01-01',
      });

      expect(screen.getByText(/every week/i)).toBeInTheDocument();
    });

    it('displays "every day" for daily template', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 10,
        period: { period: 'day', amount: 1 },
        starting: '2025-01-01',
      });

      expect(screen.getByText(/every day/i)).toBeInTheDocument();
    });

    it('displays "every year" for yearly template', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 1200,
        period: { period: 'year', amount: 1 },
        starting: '2025-01-01',
      });

      expect(screen.getByText(/every year/i)).toBeInTheDocument();
    });

    it('handles undefined period amount as singular', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 100,
        period: { period: 'week', amount: undefined as unknown as number },
        starting: '2025-01-01',
      });

      // Should fall back to singular "every week" when amount is undefined
      expect(screen.getByText(/every week/i)).toBeInTheDocument();
    });
  });

  describe('Bug 4: Currency-aware amount conversion', () => {
    it('displays correct amount for USD (2 decimal places)', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 100.5, // $100.50 stored as dollars
        period: { period: 'week', amount: 1 },
        starting: '2025-01-01',
      });

      // Should show $100.50, not $1.01 (if treating as cents) or $10050 (wrong conversion)
      expect(screen.getByText(/100\.50/)).toBeInTheDocument();
    });

    it('displays correct amount for whole dollar amounts', () => {
      renderComponent({
        type: 'periodic',
        directive: 'template',
        priority: 1,
        amount: 819.54, // From user's bug report
        period: { period: 'week', amount: 2 },
        starting: '2025-12-14',
      });

      expect(screen.getByText(/819\.54/)).toBeInTheDocument();
    });
  });
});
