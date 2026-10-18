import { randomUUID } from 'node:crypto';

import { SecretName, secretsService } from '#services/secrets-service';

import { getConnection, putConnection } from './fints-connections';
import {
  authenticate,
  fetchTransactions,
  listAccounts,
  stripMarkup,
} from './fints-service';

type FakeConfig = {
  url?: string;
  pin?: string;
  tanMethodId?: number;
  bankingInformation: {
    systemId: string;
    bankMessages: [];
    bpd?: Record<string, unknown>;
    upd?: { bankAccounts: unknown[] };
  };
};

const bank = vi.hoisted(() => ({
  synchronize: vi.fn(),
  synchronizeWithTan: vi.fn(),
  getAccountStatements: vi.fn(),
  getAccountStatementsWithTan: vi.fn(),
  getAccountBalance: vi.fn(),
}));

vi.mock('lib-fints', () => {
  class FinTSConfig {
    url?: string;
    pin?: string;
    tanMethodId?: number;
    bankingInformation: FakeConfig['bankingInformation'] = {
      systemId: '0',
      bankMessages: [],
    };

    static forFirstTimeUse(
      _productId: string,
      _version: string,
      url: string,
      _blz: string,
      _userId: string,
      pin: string,
    ) {
      const config = new FinTSConfig();
      config.url = url;
      config.pin = pin;
      return config;
    }

    static fromBankingInformation(
      _productId: string,
      _version: string,
      bankingInformation: FakeConfig['bankingInformation'],
      _userId: string,
      pin?: string,
      tanMethodId?: number,
    ) {
      const config = new FinTSConfig();
      config.bankingInformation = structuredClone(bankingInformation);
      config.pin = pin;
      config.tanMethodId = tanMethodId;
      return config;
    }

    get bankingUrl() {
      return (this.bankingInformation.bpd?.url as string) ?? this.url ?? '';
    }

    get selectedTanMethod() {
      const methods = (this.bankingInformation.bpd?.supportedTanMethods ??
        []) as Array<{ id: number }>;
      return methods.find(method => method.id === this.tanMethodId);
    }

    isAccountTransactionSupported() {
      return true;
    }
  }

  class FinTSClient {
    constructor(public config: FinTSConfig) {}
    synchronize() {
      return bank.synchronize(this);
    }
    synchronizeWithTan(reference: string, tan?: string) {
      return bank.synchronizeWithTan(this, reference, tan);
    }
    canGetAccountStatements() {
      return true;
    }
    getAccountStatements(account: unknown, from: Date) {
      return bank.getAccountStatements(this, account, from);
    }
    getAccountStatementsWithTan(reference: string, tan?: string) {
      return bank.getAccountStatementsWithTan(this, reference, tan);
    }
    canGetAccountBalance() {
      return true;
    }
    getAccountBalance(account: unknown) {
      return bank.getAccountBalance(this, account);
    }
  }

  return { FinTSClient, FinTSConfig };
});

vi.mock('#util/ssrf', () => ({
  assertUrlAllowed: vi.fn().mockResolvedValue(undefined),
}));

const PIN_TAN = { id: 921, name: 'pushTAN 2.0', isDecoupled: true };
const CHIP_TAN = { id: 972, name: 'chipTAN optisch', isDecoupled: false };

function tanMethod(method: typeof PIN_TAN) {
  return {
    ...method,
    version: 7,
    activeTanMediaCount: 0,
    activeTanMedia: [],
    tanMediaRequirement: 0,
    decoupled: method.isDecoupled
      ? { waitingSecondsBetweenStatusRequests: 2 }
      : undefined,
  };
}

const BPD = {
  bankName: 'Testsparkasse',
  bankId: '12345678',
  url: 'https://fints.example.de/fints',
  supportedTanMethods: [tanMethod(PIN_TAN), tanMethod(CHIP_TAN)],
  availableTanMethodIds: [PIN_TAN.id, CHIP_TAN.id],
};

const ACCOUNT = {
  accountNumber: '1234567',
  iban: 'DE12123456780001234567',
  currency: 'EUR',
  accountType: 'CheckingAccount',
  product: 'Girokonto',
};

const ok = { success: true, requiresTan: false, bankAnswers: [] };

/** The bank answers a synchronisation like a real one: BPD first, UPD once a TAN method is set. */
function bankSynchronizes(client: { config: FakeConfig }) {
  client.config.bankingInformation.bpd = BPD;
  if (client.config.tanMethodId != null) {
    client.config.bankingInformation.upd = { bankAccounts: [ACCOUNT] };
  }
  return Promise.resolve(ok);
}

function statements(amount: number) {
  return {
    ...ok,
    bankingInformationUpdated: false,
    statements: [
      {
        openingBalance: {
          date: new Date(2026, 9, 1),
          currency: 'EUR',
          value: 0,
        },
        closingBalance: {
          date: new Date(2026, 9, 2),
          currency: 'EUR',
          value: amount,
        },
        transactions: [
          {
            entryDate: new Date(2026, 9, 2),
            valueDate: new Date(2026, 9, 2),
            amount,
            fundsCode: '',
            transactionType: 'N',
            customerReference: '',
            bankReference: 'ref-1',
            remoteName: 'Arbeitgeber GmbH',
            purpose: 'Gehalt',
          },
        ],
      },
    ],
  };
}

function newConnection() {
  const id = randomUUID();
  putConnection(null, {
    id,
    name: 'Sparkasse',
    blz: '12345678',
    url: 'https://fints.example.de/fints',
    userId: 'user',
  });
  return id;
}

/** A connection that already went through the first-time setup. */
function linkedConnection(pin?: string, tanMethodId = PIN_TAN.id) {
  const id = randomUUID();
  putConnection(null, {
    id,
    name: 'Sparkasse',
    blz: '12345678',
    url: 'https://fints.example.de/fints',
    userId: 'user',
    tanMethodId,
    pin,
    bankingInformation: {
      systemId: 'sys-1',
      bankMessages: [],
      bpd: BPD,
      upd: { bankAccounts: [ACCOUNT] },
    } as never,
  });
  return id;
}

const ACCOUNT_SUFFIX = `|${ACCOUNT.accountNumber}`;

beforeAll(() => {
  secretsService.set(SecretName.fints_productId, '0123456789ABCDEF012345678');
});

afterAll(() => {
  secretsService.reset(SecretName.fints_productId);
  secretsService.reset(SecretName.fints_connections);
});

beforeEach(() => {
  vi.clearAllMocks();
  bank.synchronize.mockImplementation(bankSynchronizes);
});

describe('stripMarkup', () => {
  it('turns a TAN challenge into plain text with its line breaks', () => {
    expect(
      stripMarkup(
        'Bitte <b>bestätigen</b> Sie<br>die Anmeldung<br/>in der App',
      ),
    ).toBe('Bitte bestätigen Sie\ndie Anmeldung\nin der App');
  });

  it('leaves no tag behind, however it is nested', () => {
    for (const challenge of [
      '<scr<b>ipt>alert(1)</scr</b>ipt>',
      '<<script>script>alert(1)<</script>/script>',
      '<img src=x onerror=alert(1)//',
    ]) {
      const text = stripMarkup(challenge) ?? '';
      expect(text).not.toMatch(/[<>]/);
    }
  });

  it('keeps an empty challenge empty', () => {
    expect(stripMarkup(undefined)).toBeUndefined();
  });
});

describe('authenticate', () => {
  it('asks for the PIN before contacting the bank', async () => {
    const id = newConnection();

    expect(await authenticate(null, id, {})).toEqual({
      state: 'pin-required',
      rejected: false,
      message: undefined,
    });
    expect(bank.synchronize).not.toHaveBeenCalled();
  });

  it('walks through the first-time setup with a decoupled TAN', async () => {
    const id = newConnection();

    const methods = await authenticate(null, id, {
      pin: '1234',
      refresh: true,
    });
    expect(methods).toEqual({
      state: 'tan-method-required',
      methods: [PIN_TAN, CHIP_TAN],
    });

    bank.synchronize.mockImplementationOnce(() =>
      Promise.resolve({
        success: true,
        requiresTan: true,
        tanReference: 'ref-1',
        tanChallenge: 'Bitte bestätigen Sie in der App<br>S-pushTAN',
        bankAnswers: [],
      }),
    );
    const challenge = await authenticate(null, id, { tanMethodId: PIN_TAN.id });
    expect(challenge).toMatchObject({
      state: 'tan-required',
      tanReference: 'ref-1',
      challenge: 'Bitte bestätigen Sie in der App\nS-pushTAN',
      decoupled: true,
    });

    // Not yet approved in the app.
    bank.synchronizeWithTan.mockResolvedValueOnce({
      success: true,
      requiresTan: true,
      tanReference: 'ref-1',
      bankAnswers: [],
    });
    expect(
      await authenticate(null, id, { tanReference: 'ref-1' }),
    ).toMatchObject({ state: 'tan-required' });

    bank.synchronizeWithTan.mockImplementationOnce(client =>
      bankSynchronizes(client),
    );
    expect(await authenticate(null, id, { tanReference: 'ref-1' })).toEqual({
      state: 'ready',
    });

    const result = listAccounts(null, id);
    expect(result).toEqual({
      accounts: [
        expect.objectContaining({
          account_id: `${id}${ACCOUNT_SUFFIX}`,
          name: `Girokonto (${ACCOUNT.iban})`,
          institution: 'Testsparkasse',
        }),
      ],
    });
  });

  it('forgets a cancelled login', async () => {
    const id = linkedConnection('1234');
    bank.synchronize.mockResolvedValueOnce({
      ...ok,
      requiresTan: true,
      tanReference: 'ref-1',
    });
    expect(await authenticate(null, id, { refresh: true })).toMatchObject({
      state: 'tan-required',
    });

    expect(await authenticate(null, id, { cancel: true })).toEqual({
      state: 'cancelled',
    });

    // The next sync goes straight to the statements, without a new dialog.
    expect(await authenticate(null, id, {})).toEqual({ state: 'ready' });
    expect(bank.synchronize).toHaveBeenCalledTimes(1);
  });

  it('does not keep the PIN unless asked to', async () => {
    const id = newConnection();
    await authenticate(null, id, { pin: '1234' });
    expect(getConnection(null, id)?.pin).toBeUndefined();

    await authenticate(null, id, { pin: '1234', storePin: true });
    expect(getConnection(null, id)?.pin).toBe('1234');
  });

  it('stops using a PIN the bank rejected', async () => {
    const id = linkedConnection('wrong');
    bank.synchronize.mockResolvedValueOnce({
      success: false,
      requiresTan: false,
      bankAnswers: [{ code: 9942, text: 'PIN falsch' }],
    });

    const state = await authenticate(null, id, { refresh: true });
    expect(state).toEqual({
      state: 'pin-required',
      rejected: true,
      message: '9942: PIN falsch',
    });
    // The stored PIN is gone, so no later sync can reuse it.
    expect(getConnection(null, id)?.pin).toBeUndefined();

    expect(
      await fetchTransactions(null, `${id}${ACCOUNT_SUFFIX}`, '2026-10-01'),
    ).toEqual({ kind: 'auth-required' });
    expect(bank.synchronize).toHaveBeenCalledTimes(1);
    expect(bank.getAccountStatements).not.toHaveBeenCalled();
  });
});

describe('fetchTransactions', () => {
  it('requires a login when no PIN is known', async () => {
    const id = linkedConnection();

    expect(
      await fetchTransactions(null, `${id}${ACCOUNT_SUFFIX}`, '2026-10-01'),
    ).toEqual({ kind: 'auth-required' });
    expect(bank.getAccountStatements).not.toHaveBeenCalled();
  });

  it('returns the statements of an account', async () => {
    const id = linkedConnection('1234');
    bank.getAccountStatements.mockResolvedValueOnce(statements(2500));

    const result = await fetchTransactions(
      null,
      `${id}${ACCOUNT_SUFFIX}`,
      '2026-10-01',
    );

    expect(result).toMatchObject({
      kind: 'ok',
      data: {
        startingBalance: 250000,
        transactions: {
          booked: [expect.objectContaining({ payeeName: 'Arbeitgeber GmbH' })],
        },
      },
    });
    expect(bank.getAccountBalance).not.toHaveBeenCalled();
  });

  it('resumes after the user approved a TAN for the statements', async () => {
    const id = linkedConnection('1234');
    const accountId = `${id}${ACCOUNT_SUFFIX}`;
    bank.getAccountStatements.mockResolvedValueOnce({
      ...ok,
      requiresTan: true,
      tanReference: 'stmt-ref',
      tanChallenge: 'TAN für Umsatzabfrage',
      statements: [],
    });

    expect(await fetchTransactions(null, accountId, '2026-10-01')).toEqual({
      kind: 'auth-required',
    });

    // Another account of the same login must not open a competing dialog.
    expect(await fetchTransactions(null, accountId, '2026-09-01')).toEqual({
      kind: 'auth-required',
    });
    expect(bank.getAccountStatements).toHaveBeenCalledTimes(1);

    expect(await authenticate(null, id, {})).toMatchObject({
      state: 'tan-required',
      tanReference: 'stmt-ref',
    });

    bank.getAccountStatementsWithTan.mockResolvedValueOnce(statements(10));
    expect(await authenticate(null, id, { tanReference: 'stmt-ref' })).toEqual({
      state: 'ready',
    });

    const result = await fetchTransactions(null, accountId, '2026-10-01');
    expect(result.kind).toBe('ok');
    // The approved result is used instead of asking the bank again.
    expect(bank.getAccountStatements).toHaveBeenCalledTimes(1);
  });

  it('waits for a manually entered TAN and reports a rejected one', async () => {
    const id = linkedConnection('1234', CHIP_TAN.id);
    bank.getAccountStatements.mockResolvedValueOnce({
      ...ok,
      requiresTan: true,
      tanReference: 'stmt-ref',
      statements: [],
    });
    await fetchTransactions(null, `${id}${ACCOUNT_SUFFIX}`, '2026-10-01');

    // Without a TAN the challenge is just shown again.
    expect(
      await authenticate(null, id, { tanReference: 'stmt-ref' }),
    ).toMatchObject({ state: 'tan-required', decoupled: false });
    expect(bank.getAccountStatementsWithTan).not.toHaveBeenCalled();

    bank.getAccountStatementsWithTan.mockResolvedValueOnce({
      success: false,
      requiresTan: false,
      bankAnswers: [{ code: 9941, text: 'TAN ungültig' }],
      statements: [],
    });
    expect(
      await authenticate(null, id, { tanReference: 'stmt-ref', tan: '1' }),
    ).toEqual({
      state: 'error',
      code: 'TAN_REJECTED',
      message: '9941: TAN ungültig',
    });
  });

  it('rejects account ids of unknown connections', async () => {
    expect(
      await fetchTransactions(null, `missing${ACCOUNT_SUFFIX}`, '2026-10-01'),
    ).toEqual({ kind: 'error', code: 'CONNECTION_NOT_FOUND' });
  });
});
