import { LazyLoadFailedError } from '@actual-app/core/shared/errors';
import { render, screen } from '@testing-library/react';
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

  it('renders the generic simple message for an app-init-failure without a specific cause', () => {
    const error = {
      type: 'app-init-failure',
      BackendInitFailure: true,
    };

    render(<FatalError error={error} />, { wrapper: TestProviders });

    expect(
      screen.getByText(/problem loading the app in this browser version/i),
    ).toBeInTheDocument();
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
