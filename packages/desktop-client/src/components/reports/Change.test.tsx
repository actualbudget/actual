import React from 'react';

import { theme } from '@actual-app/components/theme';
import { render, screen } from '@testing-library/react';

import { Change } from './Change';

import { TestProviders } from '@desktop-client/mocks';

describe('Change', () => {
  it('renders a positive amount with a plus sign and positive color', () => {
    render(
      <TestProviders>
        <Change amount={12345} />
      </TestProviders>,
    );
    const el = screen.getByText('+123.45');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.reportsNumberPositive}`);
  });

  it('renders zero with a plus sign and neutral color', () => {
    render(
      <TestProviders>
        <Change amount={0} />
      </TestProviders>,
    );
    const el = screen.getByText('+0.00');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.reportsNumberNeutral}`);
  });

  it('renders a negative amount with a minus sign and negative color', () => {
    render(
      <TestProviders>
        <Change amount={-9876} />
      </TestProviders>,
    );
    const el = screen.getByText('-98.76');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.reportsNumberNegative}`);
  });

  it('merges custom style prop', () => {
    render(
      <TestProviders>
        <Change amount={1000} style={{ fontWeight: 'bold' }} />
      </TestProviders>,
    );
    const el = screen.getByText('+10.00');
    expect(el).toHaveStyle('font-weight: bold');
    expect(el).toHaveStyle(`color: ${theme.reportsNumberPositive}`);
  });
});
