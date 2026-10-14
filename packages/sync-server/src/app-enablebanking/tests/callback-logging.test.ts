import { format } from 'node:util';

import createDebug from 'debug';
import request from 'supertest';

import { handlers } from '#app-enablebanking/app-enablebanking';
import { enableBankingService } from '#app-enablebanking/services/enablebanking-service';

it.each(['', 'actual:*', 'actual-sensitive:enable-banking'])(
  'keeps callback credentials and provider details behind the sensitive namespace (%s)',
  async namespaces => {
    const previous = createDebug.disable();
    createDebug.enable(namespaces);
    const log = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const provider = vi.spyOn(enableBankingService, 'createSession');
    const secret = 'private-callback-credential';
    try {
      provider.mockResolvedValueOnce({
        session_id: secret,
        accounts: [],
      });
      await request(handlers)
        .get('/auth_callback')
        .query({ code: secret, state: secret })
        .expect(200);
      provider.mockRejectedValueOnce(new Error(secret));
      await request(handlers)
        .get('/auth_callback')
        .query({ code: secret, state: secret })
        .expect(500);
      const output = log.mock.calls.map(args => format(...args)).join('\n');
      expect(output.includes(secret)).toBe(
        namespaces === 'actual-sensitive:enable-banking',
      );
      if (namespaces === 'actual-sensitive:enable-banking') {
        expect(output).toContain('Error:');
        expect(output).toContain('callback-logging.test.ts:');
      }
    } finally {
      provider.mockRestore();
      log.mockRestore();
      createDebug.enable(previous);
    }
  },
);
