import { sendCatch } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { GoCardlessExternalMsgModal } from './GoCardlessExternalMsgModal';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  sendCatch: vi.fn(),
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [null],
}));

vi.mock('#hooks/useGoCardlessStatus', () => ({
  useGoCardlessStatus: () => ({
    configuredGoCardless: true,
    isLoading: false,
  }),
}));

describe('GoCardlessExternalMsgModal - Country Auto-selection', () => {
  const mockProps = {
    onMoveExternal: vi.fn(),
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  const originalIntl = global.Intl;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.mocked(sendCatch).mockResolvedValue({ data: [], error: undefined });
  });

  afterEach(() => {
    global.Intl = originalIntl;
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    vi.clearAllMocks();
  });

  it('should pre-select country based on browser timezone', () => {
    // Mock timezone to Germany
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'Europe/Berlin' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;

    Object.defineProperty(global, 'navigator', {
      value: { language: 'en' },
      writable: true,
    });

    render(
      <TestProviders>
        <GoCardlessExternalMsgModal {...mockProps} />
      </TestProviders>,
    );

    const countryInput = screen.getByPlaceholderText('(please select)');
    // The Autocomplete component displays the country name, not the code
    expect(countryInput).toHaveValue('Germany');
  });

  it('should pre-select country based on locale when timezone is not in EU', () => {
    // Mock timezone to US (not supported)
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;

    // But locale is UK
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-GB' },
      writable: true,
    });

    render(
      <TestProviders>
        <GoCardlessExternalMsgModal {...mockProps} />
      </TestProviders>,
    );

    const countryInput = screen.getByPlaceholderText('(please select)');
    expect(countryInput).toHaveValue('United Kingdom');
  });

  it('should leave country empty when neither timezone nor locale match', () => {
    // Mock timezone to US
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;

    // Locale is also US
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
    });

    render(
      <TestProviders>
        <GoCardlessExternalMsgModal {...mockProps} />
      </TestProviders>,
    );

    const countryInput = screen.getByPlaceholderText('(please select)');
    expect(countryInput).toHaveValue('');
  });

  it('should prioritize timezone over locale', () => {
    // Mock timezone to France
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'Europe/Paris' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;

    // Locale is German
    Object.defineProperty(global, 'navigator', {
      value: { language: 'de-DE' },
      writable: true,
    });

    render(
      <TestProviders>
        <GoCardlessExternalMsgModal {...mockProps} />
      </TestProviders>,
    );

    const countryInput = screen.getByPlaceholderText('(please select)');
    // Should select France from timezone, not Germany from locale
    expect(countryInput).toHaveValue('France');
  });
});

describe('GoCardlessExternalMsgModal - Bank list errors', () => {
  const mockProps = {
    onMoveExternal: vi.fn(),
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  const originalIntl = global.Intl;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Pre-select a country so the modal actually fetches the bank list.
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'Europe/Berlin' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;

    Object.defineProperty(global, 'navigator', {
      value: { language: 'en' },
      writable: true,
    });
  });

  afterEach(() => {
    global.Intl = originalIntl;
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    vi.clearAllMocks();
  });

  function renderModal() {
    render(
      <TestProviders>
        <GoCardlessExternalMsgModal {...mockProps} />
      </TestProviders>,
    );
  }

  it('shows the reason GoCardless rejected the request', async () => {
    vi.mocked(sendCatch).mockResolvedValue({
      data: {
        error_code: 'INTERNAL_ERROR',
        error_type: 'IP address access denied',
        error_details: {
          status: 403,
          summary: 'IP address access denied',
          detail:
            "Your IP 203.0.113.7 isn't whitelisted to perform this action",
        },
      },
      error: undefined,
    });

    renderModal();

    expect(
      await screen.findByText(
        /IP address access denied: Your IP 203\.0\.113\.7 isn't whitelisted to perform this action/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/access credentials might be misconfigured/),
    ).not.toBeInTheDocument();
  });

  it('shows the rate limit GoCardless reported', async () => {
    vi.mocked(sendCatch).mockResolvedValue({
      data: {
        error_code: 'INTERNAL_ERROR',
        error_type:
          'Daily request limit set by the Institution has been exceeded',
        error_details: {
          status: 429,
          summary: 'Rate limit exceeded',
          detail: 'The rate limit for this resource is 4/day',
        },
      },
      error: undefined,
    });

    renderModal();

    expect(
      await screen.findByText(
        /Rate limit exceeded: The rate limit for this resource is 4\/day/,
      ),
    ).toBeInTheDocument();
  });

  it('falls back to the generic message when the failure carries no reason', async () => {
    vi.mocked(sendCatch).mockResolvedValue({
      data: undefined,
      error: { type: 'ServerError', code: 'network-failure' },
    });

    renderModal();

    expect(
      await screen.findByText(/access credentials might be misconfigured/),
    ).toBeInTheDocument();
  });
});
