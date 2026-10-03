// @ts-strict-ignore
import * as asyncStorage from '#platform/server/asyncStorage';
import { post } from '#server/post';

import { app } from './app';

vi.mock('#server/post', () => ({ post: vi.fn() }));
vi.mock('#server/server-config', () => ({
  getServer: () => ({ GOCARDLESS_SERVER: 'http://gc' }),
}));

const pollHandler = app.handlers['gocardless-poll-web-token'];
const stopHandler = app.handlers['gocardless-poll-web-token-stop'];

const TEN_MINUTES = 10 * 60 * 1000;

describe('gocardless-poll-web-token', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(post).mockReset();
    vi.mocked(post).mockResolvedValue(null);
    vi.mocked(asyncStorage.getItem).mockResolvedValue('token');
  });

  afterEach(async () => {
    await stopHandler();
    vi.useRealTimers();
  });

  it('keeps polling after 10 minutes instead of timing out', async () => {
    let result;
    void pollHandler({ requisitionId: 'req' }).then(r => {
      result = r;
    });

    await vi.advanceTimersByTimeAsync(TEN_MINUTES);
    const callsAtTenMinutes = vi.mocked(post).mock.calls.length;
    expect(callsAtTenMinutes).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(vi.mocked(post).mock.calls.length).toBeGreaterThan(
      callsAtTenMinutes,
    );
    expect(result).toBeUndefined();

    // The link eventually completes after the threshold
    vi.mocked(post).mockResolvedValue({ accounts: ['a'] });
    await vi.advanceTimersByTimeAsync(3000);
    expect(result).toEqual({ data: { accounts: ['a'] } });
  });

  it('stops polling when asked to stop', async () => {
    let result;
    void pollHandler({ requisitionId: 'req' }).then(r => {
      result = r;
    });

    await vi.advanceTimersByTimeAsync(TEN_MINUTES + 1000);
    await stopHandler();
    await vi.advanceTimersByTimeAsync(3000);
    const calls = vi.mocked(post).mock.calls.length;

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(vi.mocked(post).mock.calls.length).toBe(calls);
    expect(result).toBeUndefined();
  });

  it('resolves with an error when GoCardless reports one', async () => {
    vi.mocked(post).mockResolvedValue({
      error_code: 'X',
      error_type: 'BAD',
    });
    const result = await pollHandler({ requisitionId: 'req' });
    expect(result).toEqual({ error: 'unknown', message: 'BAD' });
  });
});
