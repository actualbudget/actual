import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { GoCardlessExternalMsgModal } from './GoCardlessExternalMsgModal';

import { TestProviders } from '@desktop-client/mocks';

vi.mock('@desktop-client/hooks/useGlobalPref', () => ({
  useGlobalPref: () => [null],
}));

vi.mock('@desktop-client/hooks/useGoCardlessStatus', () => ({
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
