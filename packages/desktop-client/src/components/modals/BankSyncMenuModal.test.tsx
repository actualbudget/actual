import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { BankSyncLinkProviderModal } from './BankSyncLinkProviderModal';
import { BankSyncMenuModal } from './BankSyncMenuModal';

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

type Options = Extract<ModalType, { name: 'bank-sync-menu' }>['options'];

function renderMenu(overrides: Partial<Options> = {}, interval?: string) {
  const options: Options = {
    hasProvidersItem: true,
    hasAutomaticSyncItem: true,
    onProvidersChange: vi.fn(),
    ...overrides,
  };
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  if (interval != null) {
    store.dispatch(mergeSyncedPrefs({ 'bank-sync-interval': interval }));
  }
  store.dispatch(pushModal({ modal: { name: 'bank-sync-menu', options } }));
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <BankSyncMenuModal {...options} />
    </TestProviders>,
  );
  return { store, options };
}

const row = (name: string | RegExp) => screen.queryByRole('button', { name });

describe('BankSyncMenuModal', () => {
  it('offers providers and automatic syncing but not linking', () => {
    renderMenu();

    expect(row('Providers')).toBeInTheDocument();
    expect(row('Automatic syncing: never')).toBeInTheDocument();
    expect(row('Link bank account')).not.toBeInTheDocument();
  });

  it('shows only the entries that apply', () => {
    renderMenu({ hasAutomaticSyncItem: false });

    expect(row('Providers')).toBeInTheDocument();
    expect(row(/Automatic syncing/)).not.toBeInTheDocument();
  });

  it.each([
    ['1440', 'Automatic syncing: every day'],
    ['45', 'Automatic syncing: every 45 minutes'],
    ['60', 'Automatic syncing: every hour'],
    ['120', 'Automatic syncing: every 2 hours'],
  ])('shows an interval of %s minutes in the row', (interval, label) => {
    renderMenu({}, interval);

    expect(row(label)).toBeInTheDocument();
  });

  it('opens the providers sheet', async () => {
    const { store, options } = renderMenu();

    await userEvent.click(row('Providers') as HTMLElement);

    expect(store.getState().modals.modalStack).toEqual([
      {
        name: 'bank-sync-providers',
        options: { onProvidersChange: options.onProvidersChange },
      },
    ]);
  });

  it('opens the automatic syncing sheet', async () => {
    const { store } = renderMenu();

    await userEvent.click(row(/Automatic syncing/) as HTMLElement);

    expect(store.getState().modals.modalStack).toEqual([
      { name: 'bank-sync-automatic-sync' },
    ]);
  });
});

describe('BankSyncLinkProviderModal', () => {
  it('starts the link flow for the chosen provider and closes', async () => {
    const onLinkSimpleFin = vi.fn();
    const onLinkGoCardless = vi.fn();
    const linkProviders = [
      {
        id: 'simpleFin' as const,
        displayName: 'SimpleFIN',
        onLink: onLinkSimpleFin,
      },
      {
        id: 'goCardless' as const,
        displayName: 'GoCardless',
        onLink: onLinkGoCardless,
      },
    ];
    const queryClient = createTestQueryClient();
    const store = configureTestAppStore({ queryClient });
    store.dispatch(
      pushModal({
        modal: { name: 'bank-sync-link-provider', options: { linkProviders } },
      }),
    );
    render(
      <TestProviders queryClient={queryClient} store={store}>
        <BankSyncLinkProviderModal linkProviders={linkProviders} />
      </TestProviders>,
    );

    await userEvent.click(row('GoCardless') as HTMLElement);

    expect(onLinkGoCardless).toHaveBeenCalledTimes(1);
    expect(onLinkSimpleFin).not.toHaveBeenCalled();
    expect(store.getState().modals.modalStack).toEqual([]);
  });
});
