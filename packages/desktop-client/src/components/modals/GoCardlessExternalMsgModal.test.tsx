import { sendCatch } from '@actual-app/core/platform/client/connection';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import {
  GoCardlessExternalMsgModal,
  SlowLinkingNotice,
} from './GoCardlessExternalMsgModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  async importOriginal => ({
    ...(await importOriginal<object>()),
    sendCatch: vi.fn(),
  }),
);

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [null],
}));

vi.mock('#hooks/useGoCardlessStatus', () => ({
  useGoCardlessStatus: () => ({
    configuredGoCardless: true,
    isLoading: false,
  }),
}));

beforeEach(() => {
  vi.mocked(sendCatch).mockResolvedValue({ data: [] } as never);
});

describe('GoCardlessExternalMsgModal - Country Auto-selection', () => {
  const mockProps = {
    onMoveExternal: vi.fn(),
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  const originalIntl = global.Intl;
  const originalNavigator = global.navigator;

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

describe('GoCardlessExternalMsgModal - slow linking notice', () => {
  const originalIntl = global.Intl;
  const NOTICE = /Linking this account is taking longer than expected/;
  const TEN_MINUTES = 10 * 60 * 1000;

  afterEach(() => {
    vi.useRealTimers();
    global.Intl = originalIntl;
    vi.clearAllMocks();
  });

  it('shows a notice after 10 minutes without abandoning the wait', async () => {
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'Europe/Berlin' }),
      })) as unknown as typeof Intl.DateTimeFormat,
    } as typeof Intl;
    vi.mocked(sendCatch).mockResolvedValue({
      data: [{ id: 'BANK_1', name: 'Test Bank' }],
    } as never);

    const onMoveExternal = vi.fn(() => new Promise<never>(vi.fn()));
    const onClose = vi.fn();

    render(
      <TestProviders>
        <GoCardlessExternalMsgModal
          onMoveExternal={onMoveExternal}
          onSuccess={vi.fn()}
          onClose={onClose}
        />
      </TestProviders>,
    );

    const user = userEvent.setup();
    await screen.findByText('Choose your bank:');
    const bank = screen.getAllByPlaceholderText('(please select)')[1];
    await user.click(bank);
    await user.type(bank, 'Test');
    await user.click(await screen.findByText('Test Bank'));

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Link bank in browser/ }),
      );
    });

    expect(onMoveExternal).toHaveBeenCalledWith({ institutionId: 'BANK_1' });
    expect(screen.getByText('Waiting on GoCardless...')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TEN_MINUTES - 1000);
    });
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.getByText('Waiting on GoCardless...')).toBeInTheDocument();
    expect(
      screen.queryByText('Timed out. Please try again.'),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('SlowLinkingNotice appears only after 10 minutes, as a warning', async () => {
    vi.useFakeTimers();
    render(
      <TestProviders>
        <SlowLinkingNotice />
      </TestProviders>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TEN_MINUTES - 1000);
    });
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByText(/An error occurred/)).not.toBeInTheDocument();
  });
});
