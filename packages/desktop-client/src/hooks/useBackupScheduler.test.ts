import { renderHook, waitFor } from '@testing-library/react';

import type * as BackupsModule from '#backups';
import { serverPush } from '#mocks/connection';

import { useBackupScheduler } from './useBackupScheduler';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const schedulerMocks = vi.hoisted(() => ({
  notifyChange: vi.fn(),
  reevaluate: vi.fn(),
  stop: vi.fn(),
  createBackupScheduler: vi.fn(),
  loadBackupState: vi.fn(() => Promise.resolve()),
  clearBackupState: vi.fn(),
}));

vi.mock('#backups', async () => {
  const actual = await vi.importActual<typeof BackupsModule>('#backups');
  return {
    ...actual,
    getSupportedProviders: () => [{ kind: 'folder' }],
    createBackupScheduler: schedulerMocks.createBackupScheduler,
    loadBackupState: schedulerMocks.loadBackupState,
    clearBackupState: schedulerMocks.clearBackupState,
  };
});

vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: (name: string) => [
    name === 'id' ? 'budget-1' : 'My Budget',
    vi.fn(),
  ],
}));

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => true,
}));

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('#redux', () => ({
  useDispatch: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useBackupScheduler', () => {
  beforeEach(() => {
    schedulerMocks.createBackupScheduler.mockReturnValue({
      notifyChange: schedulerMocks.notifyChange,
      reevaluate: schedulerMocks.reevaluate,
      stop: schedulerMocks.stop,
    });

    // jsdom has no Web Locks; grant the lock immediately.
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: vi.fn((_name: string, callback: () => Promise<void>) =>
          callback(),
        ),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error -- cleaning up the test-only stub
    delete navigator.locks;
  });

  it('loads backup state, runs the scheduler and forwards applied changes', async () => {
    const { unmount } = renderHook(() => useBackupScheduler());

    await waitFor(() =>
      expect(schedulerMocks.createBackupScheduler).toHaveBeenCalledTimes(1),
    );
    expect(schedulerMocks.loadBackupState).toHaveBeenCalledWith({
      budgetId: 'budget-1',
      budgetName: 'My Budget',
    });
    expect(schedulerMocks.reevaluate).toHaveBeenCalled();

    serverPush('sync-event', { type: 'applied', tables: ['transactions'] });
    await waitFor(() =>
      expect(schedulerMocks.notifyChange).toHaveBeenCalledTimes(1),
    );

    serverPush('sync-event', { type: 'success', tables: ['transactions'] });
    await Promise.resolve();
    expect(schedulerMocks.notifyChange).toHaveBeenCalledTimes(1);

    unmount();
    await waitFor(() => expect(schedulerMocks.stop).toHaveBeenCalledTimes(1));
    expect(schedulerMocks.clearBackupState).toHaveBeenCalled();
  });
});
