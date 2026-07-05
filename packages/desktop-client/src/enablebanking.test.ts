import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizeBank } from './enablebanking';

const { sendCatch } = vi.hoisted(() => ({ sendCatch: vi.fn() }));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  sendCatch: (...args: unknown[]) => sendCatch(...args),
}));

vi.mock('#modals/modalsSlice', () => ({
  pushModal: (modal: unknown) => ({ type: 'modals/pushModal', payload: modal }),
}));

type MoveExternalResult = {
  error?: string;
  message?: string;
  data?: { accounts: unknown[] };
};

type MoveExternalArgs = {
  aspspId: string;
  country: string;
  maxConsentValidity: number;
  psuType?: string;
  onStateReady?: (state: string) => void;
};

type CapturedOptions = {
  onMoveExternal: (args: MoveExternalArgs) => Promise<MoveExternalResult>;
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) =>
      store.has(key) ? (store.get(key) ?? null) : null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

const moveArgs: MoveExternalArgs = {
  aspspId: 'test-bank',
  country: 'ES',
  maxConsentValidity: 90,
  psuType: 'personal',
};

function captureOnMoveExternal(): CapturedOptions['onMoveExternal'] {
  const dispatch = vi.fn();
  // _authorize dispatches the modal synchronously before awaiting anything, so
  // the captured options are available immediately.
  void authorizeBank(dispatch as never);

  const action = dispatch.mock.calls[0][0] as {
    payload: { modal: { options: CapturedOptions } };
  };
  return action.payload.modal.options.onMoveExternal;
}

describe('enablebanking authorizeBank', () => {
  beforeEach(() => {
    sendCatch.mockReset();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the authorization URL in a new tab (not a constrained popup) and polls', async () => {
    sendCatch.mockImplementation(async (name: string) => {
      if (name === 'enablebanking-start-auth') {
        return {
          data: {
            data: { url: 'https://bank.example/auth', state: 'state-123' },
          },
        };
      }
      if (name === 'enablebanking-poll-auth') {
        return { data: { data: { accounts: [] } } };
      }
      return {};
    });

    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue({} as ReturnType<typeof window.open>);

    const onMoveExternal = captureOnMoveExternal();
    const result = await onMoveExternal(moveArgs);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://bank.example/auth', '_blank');
    // No third windowFeatures argument: the constrained-popup string is gone.
    expect(openSpy.mock.calls[0]).toHaveLength(2);
    expect(sendCatch).toHaveBeenCalledWith('enablebanking-poll-auth', {
      state: 'state-123',
    });
    expect(result).toEqual({ data: { accounts: [] } });

    openSpy.mockRestore();
  });

  it('still polls when window.open returns null (Electron denies the child window but opens the URL externally)', async () => {
    sendCatch.mockImplementation(async (name: string) => {
      if (name === 'enablebanking-start-auth') {
        return {
          data: {
            data: { url: 'https://bank.example/auth', state: 'state-123' },
          },
        };
      }
      if (name === 'enablebanking-poll-auth') {
        return { data: { data: { accounts: [] } } };
      }
      return {};
    });

    // In the Electron desktop app the window-open handler returns
    // { action: 'deny' } (opening the URL in the system browser instead), so
    // window.open resolves to null even though the page opened. The flow must
    // not treat that as a failure.
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const onMoveExternal = captureOnMoveExternal();
    const result = await onMoveExternal(moveArgs);

    expect(openSpy).toHaveBeenCalledWith('https://bank.example/auth', '_blank');
    expect(sendCatch).toHaveBeenCalledWith('enablebanking-poll-auth', {
      state: 'state-123',
    });
    expect(result).toEqual({ data: { accounts: [] } });

    openSpy.mockRestore();
  });

  it('returns a missing-auth error before opening a tab when the URL or state is absent', async () => {
    sendCatch.mockImplementation(async (name: string) => {
      if (name === 'enablebanking-start-auth') {
        return { data: { data: {} } };
      }
      return {};
    });

    const openSpy = vi.spyOn(window, 'open');

    const onMoveExternal = captureOnMoveExternal();
    const result = await onMoveExternal(moveArgs);

    expect(result.error).toBe('unknown');
    expect(openSpy).not.toHaveBeenCalled();
    expect(sendCatch).not.toHaveBeenCalledWith(
      'enablebanking-poll-auth',
      expect.anything(),
    );

    openSpy.mockRestore();
  });

  it('short-circuits when starting auth fails, without opening a tab', async () => {
    sendCatch.mockImplementation(async (name: string) => {
      if (name === 'enablebanking-start-auth') {
        return { error: { message: 'network down' } };
      }
      return {};
    });

    const openSpy = vi.spyOn(window, 'open');

    const onMoveExternal = captureOnMoveExternal();
    const result = await onMoveExternal(moveArgs);

    expect(result).toEqual({ error: 'unknown', message: 'network down' });
    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
