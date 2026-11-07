import request from 'supertest';

import { handlers } from '#app-enablebanking/app-enablebanking';
import { enableBankingService } from '#app-enablebanking/services/enablebanking-service';
import { SecretName, secretsService } from '#services/secrets-service';

const application = SecretName.enablebanking_applicationId;
const key = SecretName.enablebanking_secretKey;

afterEach(() => {
  secretsService.reset(application);
  secretsService.reset(key);
  vi.restoreAllMocks();
});

it.each([false, true])(
  'requires an admin with existing configuration: %s',
  async configured => {
    if (configured) {
      secretsService.set(application, 'original-id');
      secretsService.set(key, 'original-key');
    }
    const validate = vi
      .spyOn(enableBankingService, 'validateCredentials')
      .mockResolvedValue({ name: 'Test app' });
    for (const [token, status] of [
      ['invalid-token', 401],
      ['valid-token-user', 403],
    ] as const) {
      for (const body of [
        {},
        { applicationId: 'replacement-id', secretKey: 'replacement-key' },
      ]) {
        await request(handlers)
          .post('/configure')
          .set('x-actual-token', token)
          .send(body)
          .expect(status);
      }
      expect(secretsService.get(application)).toBe(
        configured ? 'original-id' : null,
      );
      expect(secretsService.get(key)).toBe(configured ? 'original-key' : null);
    }
    expect(validate).not.toHaveBeenCalled();
    await request(handlers)
      .post('/configure')
      .set('x-actual-token', 'valid-token-admin')
      .send({ applicationId: 'replacement-id', secretKey: 'replacement-key' })
      .expect(200);
    expect(validate).toHaveBeenCalledWith('replacement-id', 'replacement-key');
    expect(secretsService.get(application)).toBe('replacement-id');
    expect(secretsService.get(key)).toBe('replacement-key');
  },
);
