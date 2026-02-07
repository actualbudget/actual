import { SecretName, secretsService } from '../../services/secrets-service';
import { BunqAuthError } from '../errors';
import { BunqClient } from '../services/bunq-client';
import { generateBunqKeyPair } from '../services/bunq-crypto';
import { bunqService } from '../services/bunq-service';

describe('bunq-service auth context recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recreates installation/session context when registerDevice gets 403', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'production'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      // stale context
      [SecretName.bunq_installationToken, 'stale-installation-token'],
      [SecretName.bunq_serverPublicKey, 'stale-server-public-key'],
      // force auth phase
      [SecretName.bunq_sessionToken, null],
      [SecretName.bunq_userId, null],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation((name, value) => {
      secretMap.set(name, value);
      return { changes: 1 };
    });

    const registerDeviceSpy = vi
      .spyOn(BunqClient.prototype, 'registerDevice')
      .mockRejectedValueOnce(
        new BunqAuthError('Bunq authentication failed', { status: 403 }),
      )
      .mockResolvedValueOnce({});

    const createInstallationSpy = vi
      .spyOn(BunqClient.prototype, 'createInstallation')
      .mockResolvedValue({
        installationToken: 'fresh-installation-token',
        serverPublicKey: 'fresh-server-public-key',
      });

    vi.spyOn(BunqClient.prototype, 'createSession').mockResolvedValue({
      sessionToken: 'fresh-session-token',
      userId: '44',
    });

    vi.spyOn(BunqClient.prototype, 'listMonetaryAccounts').mockResolvedValue({
      Response: [],
    });

    const res = await bunqService.getStatus();

    expect(res).toMatchObject({
      configured: true,
      environment: 'production',
      authContextReady: true,
    });
    expect(registerDeviceSpy).toHaveBeenCalledTimes(2);
    expect(createInstallationSpy).toHaveBeenCalledTimes(1);
    expect(secretMap.get(SecretName.bunq_installationToken)).toBe(
      'fresh-installation-token',
    );
    expect(secretMap.get(SecretName.bunq_serverPublicKey)).toBe(
      'fresh-server-public-key',
    );
    expect(secretMap.get(SecretName.bunq_sessionToken)).toBe(
      'fresh-session-token',
    );
    expect(secretMap.get(SecretName.bunq_userId)).toBe('44');
  });
});
