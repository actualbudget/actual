import React from 'react';
import { Provider } from 'react-redux';

import { theme } from '@actual-app/components/theme';
import { render, screen } from '@testing-library/react';

import { Change } from './Change';

import { store } from '@desktop-client/redux/store';

describe('Change', () => {
  it('renders a positive amount with a plus sign and green color', () => {
    render(
      <Provider store={store}>
        <Change amount={12345} />
      </Provider>,
    );
    const el = screen.getByText('+123.45');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.noticeTextLight}`);
  });

  it('renders zero with a plus sign and green color', () => {
    render(
      <Provider store={store}>
        <Change amount={0} />
      </Provider>,
    );
    const el = screen.getByText('+0.00');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.noticeTextLight}`);
  });

  it('renders a negative amount with a minus sign and red color', () => {
    render(
      <Provider store={store}>
        <Change amount={-9876} />
      </Provider>,
    );
    const el = screen.getByText('-98.76');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle(`color: ${theme.errorText}`);
  });

  it('merges custom style prop', () => {
    render(
      <Provider store={store}>
        <Change amount={1000} style={{ fontWeight: 'bold' }} />
      </Provider>,
    );
    const el = screen.getByText('+10.00');
    expect(el).toHaveStyle('font-weight: bold');
    expect(el).toHaveStyle(`color: ${theme.noticeTextLight}`);
  });
});
