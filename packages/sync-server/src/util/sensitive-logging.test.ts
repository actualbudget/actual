import { format } from 'node:util';

import createDebug from 'debug';
import express from 'express';
import request from 'supertest';

import { enableBankingService } from '#app-enablebanking/services/enablebanking-service';
import { handleEnableBankingError } from '#app-enablebanking/utils/errors';
import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';

vi.mock('#app-enablebanking/utils/jwt', () => ({
  getJWT: () => 'provider-jwt',
}));

it.each(['', 'actual:*', 'actual-sensitive:enable-banking'])(
  'protects provider response bodies and session URLs (%s)',
  async namespaces => {
    const previous = createDebug.disable();
    createDebug.enable(namespaces);
    const log = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const secret = 'private-provider-session';
    secretsService.set(
      SecretName.enablebanking_applicationId,
      'test-application',
    );
    secretsService.set(SecretName.enablebanking_secretKey, 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    try {
      const error = handleEnableBankingError(400, {
        message: `Invalid redirect for ${secret}`,
      });
      expect(error.message).toContain('Invalid redirect');
      await enableBankingService.getSession(secret);
      const output = log.mock.calls.map(args => format(...args)).join('\n');
      expect(output.includes(secret)).toBe(
        namespaces === 'actual-sensitive:enable-banking',
      );
      if (namespaces === 'actual-sensitive:enable-banking') {
        expect(output).toContain('Invalid redirect');
        expect(output).toContain(`/sessions/${secret}`);
      }
    } finally {
      secretsService.reset(SecretName.enablebanking_applicationId);
      secretsService.reset(SecretName.enablebanking_secretKey);
      vi.unstubAllGlobals();
      log.mockRestore();
      createDebug.enable(previous);
    }
  },
);

it.each(['', 'actual:*', 'actual-sensitive:bank-sync'])(
  'protects query strings and errors in the shared bank handler (%s)',
  async namespaces => {
    const previous = createDebug.disable();
    createDebug.enable(namespaces);
    const log = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const ordinary = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const secret = 'private-bank-code';
    const app = express();
    app.get(
      '/callback',
      handleError(async () => {
        throw new Error(`Provider rejected ${secret}`);
      }),
    );
    try {
      await request(app).get('/callback').query({ code: secret }).expect(200);
      expect(JSON.stringify(ordinary.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(ordinary.mock.calls)).toContain('/callback');
      const output = log.mock.calls.map(args => format(...args)).join('\n');
      expect(output.includes(secret)).toBe(
        namespaces === 'actual-sensitive:bank-sync',
      );
    } finally {
      log.mockRestore();
      ordinary.mockRestore();
      createDebug.enable(previous);
    }
  },
);

it('does not log stored secret values even with all debugging enabled', () => {
  const previous = createDebug.disable();
  createDebug.enable('*');
  const log = vi.spyOn(createDebug, 'log').mockImplementation(() => undefined);
  const secret = 'private-stored-token';
  try {
    secretsService.set(SecretName.simplefin_token, secret);
    expect(secretsService.get(SecretName.simplefin_token)).toBe(secret);
    const output = log.mock.calls.map(args => format(...args)).join('\n');
    expect(output).toContain('setting secret');
    expect(output).not.toContain(secret);
  } finally {
    secretsService.reset(SecretName.simplefin_token);
    log.mockRestore();
    createDebug.enable(previous);
  }
});
