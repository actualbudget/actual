import React from 'react';
import { render } from '@testing-library/react';
import { Value } from './Value';
import { vi, describe, it, expect } from 'vitest';
import type * as PayPeriods from 'loot-core/shared/pay-periods';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

vi.mock('@actual-app/components/text', () => ({
  Text: ({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => <span style={style}>{children}</span>,
}));

vi.mock('@actual-app/components/theme', () => ({
  theme: {
    pageTextPositive: 'green',
    tableText: 'black',
  },
}));

vi.mock('@desktop-client/hooks/useAccounts', () => ({
  useAccounts: () => [],
}));

vi.mock('@desktop-client/hooks/useCategories', () => ({
  useCategories: () => ({ list: [] }),
}));

vi.mock('@desktop-client/hooks/useDateFormat', () => ({
  useDateFormat: () => 'MM/dd/yyyy',
}));

vi.mock('@desktop-client/hooks/useFormat', () => ({
  useFormat: () => (v: unknown) => v,
}));

vi.mock('@desktop-client/hooks/useLocale', () => ({
  useLocale: () => 'en-US',
}));

vi.mock('@desktop-client/hooks/usePayees', () => ({
  usePayees: () => [],
}));

// Mock pay period config
vi.mock('loot-core/shared/pay-periods', async importOriginal => {
  const actual = await importOriginal<typeof PayPeriods>();
  return {
    ...actual,
    getPayPeriodConfig: () => ({
      enabled: true,
      payFrequency: 'biweekly',
      startDate: '2023-01-01',
    }),
  };
});

describe('Value', () => {
  it('formats a normal date', () => {
    const { container } = render(<Value value="2023-10-01" field="date" />);
    expect(container.textContent).toBe('10/01/2023');
  });

  it('formats a pay period ID as a date range', () => {
    // With biweekly 2023-01-01 start, 2023-13 (1st period of 2023) is Jan 1 - Jan 14
    const { container } = render(<Value value="2023-13" field="date" />);
    expect(container.textContent).toBe('Jan 1 - Jan 14');
  });

  it('formats a month', () => {
    const { container } = render(<Value value="2023-10" field="month" />);
    expect(container.textContent).toBe('10/2023');
  });

  it('formats a pay period month as a date range', () => {
    const { container } = render(<Value value="2023-13" field="month" />);
    expect(container.textContent).toBe('Jan 1 - Jan 14');
  });

  it('formats a year', () => {
    const { container } = render(<Value value="2023-10-01" field="year" />);
    expect(container.textContent).toBe('2023');
  });
});
