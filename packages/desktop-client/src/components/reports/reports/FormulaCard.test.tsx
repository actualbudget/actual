import React from 'react';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormulaCard } from './FormulaCard';

const formulaMocks = vi.hoisted(() => ({
  formulaResultProps: null as {
    customColor?: string | null;
    error?: string | null;
    loading?: boolean;
    value: number | string | null;
  } | null,
  useFormulaExecution: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/reports/FormulaResult', () => ({
  FormulaResult: (props: {
    customColor?: string | null;
    error?: string | null;
    loading?: boolean;
    value: number | string | null;
  }) => {
    formulaMocks.formulaResultProps = props;
    return <div data-testid="formula-result">{props.value}</div>;
  },
}));

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

vi.mock('#components/reports/ReportCardName', () => ({
  ReportCardName: ({ name }: { name: string }) => <h2>{name}</h2>,
}));

vi.mock('#hooks/useFormulaExecution', () => ({
  useFormulaExecution: formulaMocks.useFormulaExecution,
}));

vi.mock('#hooks/useThemeColors', () => ({
  useThemeColors: () => ({ pageText: '#111111' }),
}));

describe('FormulaCard report cells', () => {
  beforeEach(() => {
    formulaMocks.formulaResultProps = null;
    formulaMocks.useFormulaExecution.mockReset();
    formulaMocks.useFormulaExecution.mockReturnValue({
      error: null,
      isLoading: false,
      result: '#00ff00',
    });
  });

  it('renders cached report cell data', () => {
    render(
      <FormulaCard
        widgetId="formula-widget"
        meta={{
          colorFormula: '="#00ff00"',
          name: 'Cached formula',
        }}
        reportData={{
          error: null,
          result: 123,
        }}
        onMetaChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cached formula')).toBeInTheDocument();
    expect(screen.getByTestId('formula-result').textContent).toBe('123');
    expect(formulaMocks.formulaResultProps?.value).toBe(123);
    expect(formulaMocks.formulaResultProps?.error).toBeNull();
    expect(formulaMocks.formulaResultProps?.loading).toBe(false);
    expect(formulaMocks.formulaResultProps?.customColor).toBe('#00ff00');
    expect(formulaMocks.useFormulaExecution).toHaveBeenCalledTimes(1);
    expect(formulaMocks.useFormulaExecution.mock.calls[0][0]).toBe(
      '="#00ff00"',
    );
  });
});
