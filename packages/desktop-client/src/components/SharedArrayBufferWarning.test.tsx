import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { SharedArrayBufferWarning } from './SharedArrayBufferWarning';

describe('SharedArrayBufferWarning', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // oxlint-disable-next-line typescript/no-explicit-any
    delete (window as any).Capacitor;
  });

  it('renders the warning when SharedArrayBuffer is missing', () => {
    vi.stubGlobal('SharedArrayBuffer', undefined);

    render(<SharedArrayBufferWarning />, { wrapper: TestProviders });

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders nothing when SharedArrayBuffer is available', () => {
    vi.stubGlobal('SharedArrayBuffer', class {});

    render(<SharedArrayBufferWarning />, { wrapper: TestProviders });

    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
  });

  it('renders nothing in the Capacitor native app', () => {
    vi.stubGlobal('SharedArrayBuffer', undefined);
    // oxlint-disable-next-line typescript/no-explicit-any
    (window as any).Capacitor = {};

    render(<SharedArrayBufferWarning />, { wrapper: TestProviders });

    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
  });
});
