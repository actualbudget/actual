import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as asyncStorage from '#platform/server/asyncStorage';
import { post } from '#server/post';
import { setServer } from '#server/server-config';

import { completeOpenIdLogin, prepareOpenIdLogin } from './openid-handoff';

vi.unmock('#platform/server/asyncStorage');

vi.mock('#server/post', () => ({ post: vi.fn(), get: vi.fn() }));

let dataDir: string;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'actual-openid-login-'));
  process.env.ACTUAL_DATA_DIR = dataDir;
  asyncStorage.init();
  setServer('https://test.env');
  await asyncStorage.multiRemove(['openid-login', 'user-token']);
  vi.mocked(post).mockReset();
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  delete process.env.ACTUAL_DATA_DIR;
});

it('stores a verifier locally and sends only its challenge', async () => {
  const proof = await prepareOpenIdLogin('https://test.env');
  const pending = await asyncStorage.getItem('openid-login');
  expect(pending?.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(proof.clientChallenge).toBe(
    createHash('sha256')
      .update(pending?.verifier || '')
      .digest('base64url'),
  );
  expect(proof.clientState).toBe(pending?.state);
});

it('rejects unsolicited callbacks and callbacks for another server or client', async () => {
  expect(
    await completeOpenIdLogin({ code: 'attacker-code', state: 'unknown' }),
  ).toHaveProperty('error');
  const { clientState } = await prepareOpenIdLogin('https://test.env');
  expect(
    await completeOpenIdLogin({ code: 'code', state: 'other-client' }),
  ).toHaveProperty('error');
  setServer('https://other.env');
  expect(
    await completeOpenIdLogin({ code: 'code', state: clientState }),
  ).toHaveProperty('error');
  expect(post).not.toHaveBeenCalled();
  expect(await asyncStorage.getItem('user-token')).toBeUndefined();
});

it('resumes from persisted state and retries initialization without redeeming twice', async () => {
  const { clientState } = await prepareOpenIdLogin('https://test.env');
  asyncStorage.init();
  vi.mocked(post).mockResolvedValue({ token: 'issued-token' });
  const params = { code: 'one-time-code', state: clientState };
  expect(await completeOpenIdLogin(params)).toEqual({});
  expect(await completeOpenIdLogin(params)).toEqual({});
  expect(post).toHaveBeenCalledTimes(1);
  expect(await asyncStorage.getItem('user-token')).toBe('issued-token');
  expect(
    (await asyncStorage.getItem('openid-login'))?.verifier,
  ).toBeUndefined();
});

it('does not overwrite credentials if exchange is rejected', async () => {
  await asyncStorage.setItem('user-token', 'original-token');
  const { clientState } = await prepareOpenIdLogin('https://test.env');
  vi.mocked(post).mockRejectedValue(new Error('invalid verifier'));
  expect(
    await completeOpenIdLogin({ code: 'wrong-code', state: clientState }),
  ).toHaveProperty('error');
  expect(await asyncStorage.getItem('user-token')).toBe('original-token');
});
