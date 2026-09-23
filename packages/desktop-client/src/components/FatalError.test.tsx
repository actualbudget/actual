import { LazyLoadFailedError } from '@actual-app/core/shared/errors';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TestProviders } from '#mocks';

import { FatalError } from './FatalError';

describe('FatalError', () => {
  it('renders the SharedArrayBuffer message for a non-Error AppError payload', () => {
    // matches what browser-server.js posts and what initAll().catch passes
    const error = {
      type: 'app-init-failure',
      SharedArrayBufferMissing: true,
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(screen.getAllByText(/SharedArrayBuffer/).length).toBeGreaterThan(0);
  });

  it('renders the IndexedDB message for a non-Error AppError payload', () => {
    const error = {
      type: 'app-init-failure',
      IDBFailure: true,
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(screen.getByText(/IndexedDB/)).toBeInTheDocument();
  });

  it('renders a backend-worker message for a BackendInitFailure', () => {
    const error = {
      type: 'app-init-failure',
      BackendInitFailure: true,
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(
      screen.getByText(/couldn't load a critical backend worker/i),
    ).toBeInTheDocument();
  });

  it('renders the data folder path and an access-denied hint for a DocumentDirFailure', () => {
    const error = {
      type: 'app-init-failure',
      DocumentDirFailure: true,
      path: 'C:\\Users\\peter\\Documents\\Actual',
      code: 'EPERM',
      message: 'EPERM: operation not permitted, mkdir',
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(screen.getByText('Data folder unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('C:\\Users\\peter\\Documents\\Actual'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Access to this folder was denied/),
    ).toBeInTheDocument();
    expect(screen.getByText('Restart app')).toBeInTheDocument();
  });

  it('renders the error code without the access-denied hint for a non-permission DocumentDirFailure', () => {
    const error = {
      type: 'app-init-failure',
      DocumentDirFailure: true,
      path: '/home/peter/blocked/Actual',
      code: 'ENOTDIR',
      message: 'ENOTDIR: not a directory, mkdir',
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(screen.getByText('/home/peter/blocked/Actual')).toBeInTheDocument();
    expect(screen.getByText(/ENOTDIR/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Access to this folder was denied/),
    ).not.toBeInTheDocument();
  });

  it('renders the generic simple message for an app-init-failure without a specific cause', () => {
    const error = { type: 'app-init-failure' };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(
      screen.getByText(/problem loading the app in this browser version/i),
    ).toBeInTheDocument();
  });

  it('shows the raw payload fields in the error details, not "[object Object]"', async () => {
    const error = {
      type: 'app-init-failure',
      BackendInitFailure: true,
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    await userEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText(/BackendInitFailure/)).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders the UI error message for a generic Error', () => {
    render(<FatalError error={new Error('boom')} />, {
      wrapper: TestProviders,
    });

    expect(
      screen.getByText(/unrecoverable error in the UI/i),
    ).toBeInTheDocument();
  });

  it('renders the lazy load message for a LazyLoadFailedError', () => {
    render(<FatalError error={new LazyLoadFailedError('SomeModule', null)} />, {
      wrapper: TestProviders,
    });

    expect(
      screen.getByText(/problem loading one of the chunks/i),
    ).toBeInTheDocument();
  });
});
