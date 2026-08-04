import { useState } from 'react';
import type { ReactNode } from 'react';

import { act, render, screen } from '@testing-library/react';

import { CalendarCardInner } from './CalendarCard';

const localeState = vi.hoisted(() => ({
  language: 'en',
  listeners: new Set<() => void>(),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('#components/reports/graphs/CalendarGraph', () => ({
  CalendarGraph: () => null,
}));

vi.mock('#hooks/useLocale', async () => {
  const { useSyncExternalStore } = await import('react');
  const { enUS, zhCN } = await import('date-fns/locale');

  return {
    useLocale: () => {
      const language = useSyncExternalStore(
        listener => {
          localeState.listeners.add(listener);
          return () => {
            localeState.listeners.delete(listener);
          };
        },
        () => localeState.language,
      );

      return language === 'zh-Hans' ? zhCN : enUS;
    },
  };
});

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('#hooks/useResizeObserver', () => ({
  useResizeObserver: () => vi.fn(),
}));

function CalendarCardInnerHarness() {
  const [monthNameFormats, setMonthNameFormats] = useState(['MMMM yyyy']);

  return (
    <CalendarCardInner
      calendar={{
        start: new Date(2026, 8, 1),
        end: new Date(2026, 8, 30),
        data: [],
        totalExpense: 0,
        totalIncome: 0,
      }}
      firstDayOfWeekIdx="0"
      setMonthNameFormats={setMonthNameFormats}
      selectedMonthNameFormat={monthNameFormats[0]}
      index={0}
      widgetId="calendar-widget"
      format={() => ''}
    />
  );
}

describe('CalendarCardInner', () => {
  beforeEach(() => {
    localeState.language = 'en';
    localeState.listeners.clear();

    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (this instanceof HTMLSpanElement) {
          return (this.textContent ?? '').length * 10;
        }

        return 100;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-measures the month label after an in-place language change', async () => {
    render(<CalendarCardInnerHarness />);

    expect(
      await screen.findByRole('button', { name: 'Sep 2026' }),
    ).toBeVisible();

    act(() => {
      localeState.language = 'zh-Hans';
      localeState.listeners.forEach(listener => listener());
    });

    expect(
      await screen.findByRole('button', { name: '九月 2026' }),
    ).toBeVisible();
  });
});
