import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';

import { config } from '#load-config';
import { SecretName, secretsService } from '#services/secrets-service';
import { assertUrlAllowed } from '#util/ssrf';

import { handlers as app } from './app-fints';
import { getConnection } from './fints-connections';

vi.mock('#util/ssrf', () => ({
  assertUrlAllowed: vi.fn().mockResolvedValue(undefined),
}));

const ADMIN = 'valid-token';
const USER = 'valid-token-user';

const validConnection = {
  name: 'Sparkasse',
  blz: '12345678',
  url: 'https://fints.example.de/fints',
  userId: 'user',
};

function post(path: string, body: unknown, token = ADMIN) {
  return request(app)
    .post(path)
    .set('x-actual-token', token)
    .send(body as object);
}

afterEach(() => {
  secretsService.reset(SecretName.fints_connections);
  secretsService.reset(SecretName.fints_productId);
  vi.mocked(assertUrlAllowed).mockResolvedValue(undefined);
});

describe('/fints', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).post('/status').send({});
    expect(res.statusCode).toBe(401);
  });

  it('keeps global connections to admins', async () => {
    const res = await post('/status', {}, USER);
    expect(res.statusCode).toBe(403);
  });

  it('reports whether a product id is configured', async () => {
    expect((await post('/status', {})).body.data.configured).toBe(false);

    secretsService.set(SecretName.fints_productId, '0123456789ABCDEF012345678');
    expect((await post('/status', {})).body.data.configured).toBe(true);
  });

  it('saves a connection without exposing secrets', async () => {
    const saved = await post('/connections/save', {
      connection: validConnection,
    });
    expect(saved.body.data.connection).toMatchObject({
      ...validConnection,
      hasStoredPin: false,
    });

    const id = saved.body.data.connection.id;
    const status = await post('/status', {});
    expect(status.body.data.connections).toEqual([
      expect.objectContaining({ id, name: 'Sparkasse' }),
    ]);
    expect(JSON.stringify(status.body)).not.toContain('"pin"');
  });

  it('forgets bank data when the login changes', async () => {
    const saved = await post('/connections/save', {
      connection: validConnection,
    });
    const id = saved.body.data.connection.id;

    await post('/connections/save', {
      connection: { ...validConnection, id, name: 'Renamed' },
    });
    expect(getConnection(null, id)?.name).toBe('Renamed');

    await post('/connections/save', {
      connection: { ...validConnection, id, userId: 'other' },
    });
    expect(getConnection(null, id)).toEqual({
      id,
      ...validConnection,
      userId: 'other',
      customerId: undefined,
    });
  });

  it.each([
    ['a bank code that is not 8 digits', { blz: '1234' }],
    ['an empty login', { userId: '' }],
  ])('rejects %s', async (_, override) => {
    const res = await post('/connections/save', {
      connection: { ...validConnection, ...override },
    });
    expect(res.body.data.error_code).toBe('INVALID_INPUT');
  });

  it('takes the bank address from the bank list when none is given', async () => {
    const columns = Array.from({ length: 27 }, () => '');
    columns[1] = '12345678';
    columns[3] = 'Testbank';
    columns[24] = 'https://fints.testbank.example/fints';
    const bankListPath = join(
      mkdtempSync(join(tmpdir(), 'fints-')),
      'fints_institute.csv',
    );
    writeFileSync(bankListPath, columns.join(';'), 'latin1');

    const get = config.get.bind(config);
    const spy = vi
      .spyOn(config, 'get')
      .mockImplementation(key =>
        key === 'fints.bankListPath' ? bankListPath : get(key),
      );
    try {
      const saved = await post('/connections/save', {
        connection: { ...validConnection, url: '' },
      });
      expect(saved.body.data.connection.url).toBe(
        'https://fints.testbank.example/fints',
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('asks for the address of a bank that is not in the bank list', async () => {
    const res = await post('/connections/save', {
      connection: { ...validConnection, url: '' },
    });
    expect(res.body.data.error_code).toBe('BANK_URL_REQUIRED');
  });

  it('only accepts https bank URLs', async () => {
    const res = await post('/connections/save', {
      connection: { ...validConnection, url: 'http://fints.example.de' },
    });
    expect(res.body.data.error_code).toBe('BANK_URL_BLOCKED');
  });

  it('refuses bank URLs pointing into the local network', async () => {
    vi.mocked(assertUrlAllowed).mockRejectedValueOnce(
      new Error('Blocked request to private/local IP: 10.0.0.1'),
    );
    const res = await post('/connections/save', {
      connection: { ...validConnection, url: 'https://10.0.0.1/fints' },
    });
    expect(res.body.data.error_code).toBe('BANK_URL_BLOCKED');
  });

  it('searches the bundled bank list', async () => {
    expect((await post('/bank-search', { query: 's' })).body.data).toEqual({
      banks: [],
    });
    // No ACTUAL_FINTS_BANK_LIST_PATH in tests: the bundled list is used.
    expect(
      (await post('/bank-search', { query: '12030000' })).body.data.banks,
    ).toEqual([expect.objectContaining({ blz: '12030000' })]);
    expect((await post('/bank-search', { query: 'x' }, USER)).statusCode).toBe(
      403,
    );
  });

  it('validates transaction requests', async () => {
    const res = await post('/transactions', { accountId: 'x' });
    expect(res.body.data.error_code).toBe('INVALID_INPUT');
  });

  it('removes connections', async () => {
    const saved = await post('/connections/save', {
      connection: validConnection,
    });
    const id = saved.body.data.connection.id;

    expect(
      (await post('/connections/remove', { connectionId: id })).body.data,
    ).toEqual({ removed: true });
    expect(getConnection(null, id)).toBeNull();
  });
});
