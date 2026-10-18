import { FinTSClient, FinTSConfig } from 'lib-fints';
import type {
  AccountBalanceResponse,
  BankAccount,
  ClientResponse,
  StatementResponse,
} from 'lib-fints';

import { config } from '#load-config';
import { SecretName, secretsService } from '#services/secrets-service';
import { createMutex } from '#util/mutex';
import { assertUrlAllowed } from '#util/ssrf';

import { getConnection, updateConnection } from './fints-connections';
import type { ConnectionScope, FinTSConnection } from './fints-connections';
import {
  buildAccountId,
  classifyBankAnswers,
  describeBankErrors,
  mapStatements,
  parseAccountId,
} from './fints-mapper';
import type { FinTSSyncResult } from './fints-mapper';

// Sent to the bank as the product version next to the registration number;
// the field allows at most five characters.
const PRODUCT_VERSION = '1.0';

// The PIN is held in memory only for the length of a sync session unless the
// user chose to store it. Each use extends it.
const PIN_TTL_MS = 15 * 60 * 1000;
// Banks drop a dialog that waits for a TAN after a few minutes.
const PENDING_TAN_TTL_MS = 5 * 60 * 1000;
// Statements fetched after a TAN wait here until the client retries the sync.
const RESULT_TTL_MS = 5 * 60 * 1000;

// TanMediaRequirement.Required, not exported by lib-fints.
const TAN_MEDIA_REQUIRED = 2;

type TanMethod = FinTSConfig['availableTanMethods'][number];

type PendingOperation = 'synchronize' | 'statements';

type PendingTan = {
  operation: PendingOperation;
  client: FinTSClient;
  tanReference: string;
  challenge?: string;
  photo?: { mimeType: string; data: string };
  decoupled: boolean;
  pollIntervalSeconds: number;
  requestKey?: string;
  expiresAt: number;
};

type Session = {
  pin?: string;
  pinExpiresAt: number;
  credentialsRejected: boolean;
  rejectionMessage?: string;
  syncRequested: boolean;
  pending?: PendingTan;
  results: Map<string, { value: StatementResponse; expiresAt: number }>;
  run: ReturnType<typeof createMutex>;
};

export type FinTSTanMethodOption = {
  id: number;
  name: string;
  isDecoupled: boolean;
};

export type FinTSAuthState =
  | { state: 'ready' }
  | { state: 'cancelled' }
  | { state: 'pin-required'; rejected: boolean; message?: string }
  | { state: 'tan-method-required'; methods: FinTSTanMethodOption[] }
  | { state: 'tan-media-required'; media: string[] }
  | {
      state: 'tan-required';
      tanReference: string;
      challenge?: string;
      photo?: { mimeType: string; data: string };
      decoupled: boolean;
      pollIntervalSeconds: number;
    }
  | { state: 'error'; code: FinTSErrorCode; message?: string };

export type FinTSErrorCode =
  | 'NOT_CONFIGURED'
  | 'CONNECTION_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'BANK_URL_BLOCKED'
  | 'NO_TAN_METHOD'
  | 'TAN_REJECTED'
  | 'TAN_EXPIRED'
  | 'BANK_ERROR'
  | 'ACCOUNT_MISSING'
  | 'NOT_SUPPORTED';

export type FinTSAuthInput = {
  pin?: string;
  storePin?: boolean;
  tanMethodId?: number;
  tanMediaName?: string;
  tanReference?: string;
  tan?: string;
  cancel?: boolean;
  refresh?: boolean;
};

export type FinTSAccount = {
  account_id: string;
  name: string;
  institution: string;
  orgDomain: null;
  orgId: string;
  iban?: string;
  currency: string;
};

export type FinTSTransactionsResult =
  | { kind: 'ok'; data: FinTSSyncResult }
  | { kind: 'auth-required' }
  | { kind: 'error'; code: FinTSErrorCode; message?: string };

const sessions = new Map<string, Session>();

function getSession(connectionId: string): Session {
  let session = sessions.get(connectionId);
  if (!session) {
    session = {
      pinExpiresAt: 0,
      credentialsRejected: false,
      syncRequested: false,
      results: new Map(),
      run: createMutex(),
    };
    sessions.set(connectionId, session);
  }

  const now = Date.now();
  if (session.pin && session.pinExpiresAt < now) {
    session.pin = undefined;
  }
  if (session.pending && session.pending.expiresAt < now) {
    session.pending = undefined;
  }
  for (const [key, result] of session.results) {
    if (result.expiresAt < now) {
      session.results.delete(key);
    }
  }
  return session;
}

/** Forgets all in-memory state of a connection, e.g. after it was edited. */
export function resetSession(connectionId: string) {
  sessions.delete(connectionId);
}

export function getProductId(): string | null {
  const fromConfig = String(config.get('fints.productId') ?? '').trim();
  if (fromConfig) {
    return fromConfig;
  }
  return secretsService.get(SecretName.fints_productId) || null;
}

/** The registration number is exactly 25 alphanumeric characters. */
export function isValidProductId(productId: string): boolean {
  return /^[0-9A-Za-z]{25}$/.test(productId);
}

function usablePin(session: Session, connection: FinTSConnection) {
  if (session.credentialsRejected) {
    return null;
  }
  return session.pin ?? connection.pin ?? null;
}

function touchPin(session: Session, pin: string) {
  session.pin = pin;
  session.pinExpiresAt = Date.now() + PIN_TTL_MS;
}

function createClient(
  productId: string,
  connection: FinTSConnection,
  pin: string,
): FinTSClient {
  const finTSConfig = connection.bankingInformation
    ? FinTSConfig.fromBankingInformation(
        productId,
        PRODUCT_VERSION,
        connection.bankingInformation,
        connection.userId,
        pin,
        connection.tanMethodId,
        connection.tanMediaName,
        connection.customerId || undefined,
      )
    : FinTSConfig.forFirstTimeUse(
        productId,
        PRODUCT_VERSION,
        connection.url,
        connection.blz,
        connection.userId,
        pin,
        connection.customerId || undefined,
      );
  return new FinTSClient(finTSConfig);
}

/**
 * The bank may announce its own endpoint in the BPD, which then replaces the
 * URL the user entered. Check whichever URL the client will really call.
 */
async function assertBankUrlAllowed(client: FinTSClient) {
  const url = client.config.bankingUrl;
  if (!url.startsWith('https://')) {
    throw new BankUrlBlockedError(`FinTS URL must use https: ${url}`);
  }
  try {
    await assertUrlAllowed(url);
  } catch (error) {
    throw new BankUrlBlockedError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

class BankUrlBlockedError extends Error {}

function persistBankingInformation(
  scope: ConnectionScope,
  connectionId: string,
  client: FinTSClient,
) {
  return updateConnection(scope, connectionId, connection => ({
    ...connection,
    bankingInformation: client.config.bankingInformation,
  }));
}

function rejectCredentials(
  scope: ConnectionScope,
  connectionId: string,
  session: Session,
  response: ClientResponse,
) {
  session.pin = undefined;
  session.pending = undefined;
  session.credentialsRejected = true;
  session.rejectionMessage = describeBankErrors(response.bankAnswers);
  // A stored PIN that the bank rejected must never be sent again, or every
  // sync would count towards the bank's lockout.
  updateConnection(scope, connectionId, connection => ({
    ...connection,
    pin: undefined,
  }));
}

export function stripMarkup(challenge: string | undefined): string | undefined {
  // Challenges may contain the HHD formatting subset (<br>, <b>, <ul>, ...).
  // The result is plain text: line breaks are kept, the tags removed, and
  // any angle bracket left over is dropped as well, so that no tag survives
  // however it is nested (e.g. "<scr<b>ipt>").
  return challenge
    ?.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createPending(
  operation: PendingOperation,
  client: FinTSClient,
  response: ClientResponse,
  requestKey?: string,
): PendingTan {
  const method = client.config.selectedTanMethod;
  return {
    operation,
    client,
    tanReference: response.tanReference ?? '',
    challenge: stripMarkup(response.tanChallenge),
    photo: response.tanPhoto
      ? {
          mimeType: response.tanPhoto.mimeType,
          data: Buffer.from(response.tanPhoto.image).toString('base64'),
        }
      : undefined,
    decoupled: Boolean(method?.isDecoupled),
    pollIntervalSeconds: Math.max(
      2,
      method?.decoupled?.waitingSecondsBetweenStatusRequests ?? 3,
    ),
    requestKey,
    expiresAt: Date.now() + PENDING_TAN_TTL_MS,
  };
}

function tanRequiredState(pending: PendingTan): FinTSAuthState {
  return {
    state: 'tan-required',
    tanReference: pending.tanReference,
    challenge: pending.challenge,
    photo: pending.photo,
    decoupled: pending.decoupled,
    pollIntervalSeconds: pending.pollIntervalSeconds,
  };
}

function bankError(response: ClientResponse): FinTSAuthState {
  return {
    state: 'error',
    code: 'BANK_ERROR',
    message: describeBankErrors(response.bankAnswers),
  };
}

function toTanMethodOption(method: TanMethod): FinTSTanMethodOption {
  return { id: method.id, name: method.name, isDecoupled: method.isDecoupled };
}

function hasAccounts(connection: FinTSConnection) {
  return (connection.bankingInformation?.upd?.bankAccounts.length ?? 0) > 0;
}

/**
 * Advances the login of a connection by one step, using whatever the user
 * just entered. Returns what the user has to provide next, or `ready`.
 */
export async function authenticate(
  scope: ConnectionScope,
  connectionId: string,
  input: FinTSAuthInput,
): Promise<FinTSAuthState> {
  const productId = getProductId();
  if (!productId) {
    return { state: 'error', code: 'NOT_CONFIGURED' };
  }
  if (!getConnection(scope, connectionId)) {
    return { state: 'error', code: 'CONNECTION_NOT_FOUND' };
  }

  const session = getSession(connectionId);
  return session.run(async () => {
    try {
      return await authenticateLocked(
        scope,
        connectionId,
        session,
        productId,
        input,
      );
    } catch (error) {
      session.pending = undefined;
      if (error instanceof BankUrlBlockedError) {
        return {
          state: 'error',
          code: 'BANK_URL_BLOCKED',
          message: error.message,
        };
      }
      return {
        state: 'error',
        code: 'BANK_ERROR',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

async function authenticateLocked(
  scope: ConnectionScope,
  connectionId: string,
  session: Session,
  productId: string,
  input: FinTSAuthInput,
): Promise<FinTSAuthState> {
  if (input.cancel) {
    session.pending = undefined;
    session.syncRequested = false;
    return { state: 'cancelled' };
  }

  if (input.refresh) {
    session.syncRequested = true;
  }

  if (input.pin != null) {
    if (input.pin.length === 0 || input.pin.length > 128) {
      return { state: 'error', code: 'INVALID_INPUT' };
    }
    touchPin(session, input.pin);
    session.credentialsRejected = false;
    session.rejectionMessage = undefined;
    const pin = input.pin;
    updateConnection(scope, connectionId, connection => ({
      ...connection,
      pin: input.storePin ? pin : undefined,
    }));
  }

  if (input.tanMethodId != null) {
    const tanMethodId = input.tanMethodId;
    updateConnection(scope, connectionId, connection => ({
      ...connection,
      tanMethodId,
      tanMediaName: undefined,
    }));
  }

  if (input.tanMediaName != null) {
    const tanMediaName = input.tanMediaName;
    updateConnection(scope, connectionId, connection => ({
      ...connection,
      tanMediaName,
    }));
  }

  const connection = getConnection(scope, connectionId);
  if (!connection) {
    return { state: 'error', code: 'CONNECTION_NOT_FOUND' };
  }

  const pin = usablePin(session, connection);
  if (!pin) {
    return {
      state: 'pin-required',
      rejected: session.credentialsRejected,
      message: session.rejectionMessage,
    };
  }
  touchPin(session, pin);

  const pending = session.pending;
  if (pending) {
    const isAnswer =
      input.tanReference === pending.tanReference &&
      (pending.decoupled || Boolean(input.tan));
    if (!isAnswer) {
      return tanRequiredState(pending);
    }
    return continuePending(
      scope,
      connectionId,
      session,
      productId,
      pending,
      input,
    );
  }

  if (
    session.syncRequested ||
    !hasAccounts(connection) ||
    connection.tanMethodId == null
  ) {
    return synchronize(scope, connectionId, session, productId, pin);
  }

  return { state: 'ready' };
}

async function continuePending(
  scope: ConnectionScope,
  connectionId: string,
  session: Session,
  productId: string,
  pending: PendingTan,
  input: FinTSAuthInput,
): Promise<FinTSAuthState> {
  const tan = pending.decoupled ? undefined : input.tan;

  const response =
    pending.operation === 'synchronize'
      ? await pending.client.synchronizeWithTan(pending.tanReference, tan)
      : await pending.client.getAccountStatementsWithTan(
          pending.tanReference,
          tan,
        );

  if (response.requiresTan) {
    // Decoupled approval still outstanding; keep the dialog and poll again.
    session.pending = {
      ...pending,
      tanReference: response.tanReference ?? pending.tanReference,
      expiresAt: Date.now() + PENDING_TAN_TTL_MS,
    };
    return tanRequiredState(session.pending);
  }

  session.pending = undefined;

  if (!response.success) {
    const classification = classifyBankAnswers(response.bankAnswers);
    if (classification === 'credentials-rejected') {
      rejectCredentials(scope, connectionId, session, response);
      return {
        state: 'pin-required',
        rejected: true,
        message: session.rejectionMessage,
      };
    }
    if (classification === 'tan-rejected') {
      return {
        state: 'error',
        code: 'TAN_REJECTED',
        message: describeBankErrors(response.bankAnswers),
      };
    }
    return bankError(response);
  }

  persistBankingInformation(scope, connectionId, pending.client);

  if (pending.operation === 'synchronize') {
    const outcome = completeSynchronize(scope, connectionId, session);
    if (outcome !== 'again') {
      return outcome;
    }
    const connection = getConnection(scope, connectionId);
    const pin = connection && usablePin(session, connection);
    if (!pin) {
      return { state: 'pin-required', rejected: false };
    }
    return synchronize(scope, connectionId, session, productId, pin);
  }

  if ('statements' in response && pending.requestKey) {
    session.results.set(pending.requestKey, {
      value: response,
      expiresAt: Date.now() + RESULT_TTL_MS,
    });
  }
  return { state: 'ready' };
}

/**
 * Runs the dialog synchronisation. The first contact with a bank only yields
 * the bank parameters incl. the TAN methods; once a method is chosen a second
 * synchronisation returns the user's accounts. Hence the small loop.
 */
async function synchronize(
  scope: ConnectionScope,
  connectionId: string,
  session: Session,
  productId: string,
  pin: string,
): Promise<FinTSAuthState> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const connection = getConnection(scope, connectionId);
    if (!connection) {
      return { state: 'error', code: 'CONNECTION_NOT_FOUND' };
    }

    const client = createClient(productId, connection, pin);
    await assertBankUrlAllowed(client);
    const response = await client.synchronize();

    if (response.requiresTan) {
      session.pending = createPending('synchronize', client, response);
      return tanRequiredState(session.pending);
    }

    if (!response.success) {
      if (
        classifyBankAnswers(response.bankAnswers) === 'credentials-rejected'
      ) {
        rejectCredentials(scope, connectionId, session, response);
        return {
          state: 'pin-required',
          rejected: true,
          message: session.rejectionMessage,
        };
      }
      return bankError(response);
    }

    persistBankingInformation(scope, connectionId, client);

    const outcome = completeSynchronize(scope, connectionId, session);
    if (outcome !== 'again') {
      return outcome;
    }
  }

  return {
    state: 'error',
    code: 'BANK_ERROR',
    message: 'The bank did not return any accounts.',
  };
}

/**
 * Decides what is missing after a successful synchronisation: a TAN method,
 * a TAN medium, another synchronisation to receive the accounts, or nothing.
 */
function completeSynchronize(
  scope: ConnectionScope,
  connectionId: string,
  session: Session,
): FinTSAuthState | 'again' {
  const connection = getConnection(scope, connectionId);
  const bpd = connection?.bankingInformation?.bpd;
  if (!connection || !bpd) {
    return { state: 'error', code: 'BANK_ERROR' };
  }

  const methods = bpd.supportedTanMethods.filter(method =>
    bpd.availableTanMethodIds.includes(method.id),
  );
  let method = methods.find(m => m.id === connection.tanMethodId);

  if (!method) {
    if (methods.length === 0) {
      return { state: 'error', code: 'NO_TAN_METHOD' };
    }
    if (methods.length > 1) {
      return {
        state: 'tan-method-required',
        methods: methods.map(toTanMethodOption),
      };
    }
    method = methods[0];
    const tanMethodId = method.id;
    updateConnection(scope, connectionId, current => ({
      ...current,
      tanMethodId,
    }));
    return 'again';
  }

  if (!hasAccounts(connection)) {
    // The accounts only come with a synchronisation that names a TAN method.
    // The loop in `synchronize` bounds how often this is retried.
    return 'again';
  }

  if (
    method.tanMediaRequirement === TAN_MEDIA_REQUIRED &&
    !connection.tanMediaName &&
    method.activeTanMedia.length > 0
  ) {
    if (method.activeTanMedia.length > 1) {
      return { state: 'tan-media-required', media: method.activeTanMedia };
    }
    const tanMediaName = method.activeTanMedia[0];
    updateConnection(scope, connectionId, current => ({
      ...current,
      tanMediaName,
    }));
  }

  session.syncRequested = false;
  return { state: 'ready' };
}

function findAccount(
  connection: FinTSConnection,
  accountNumber: string,
  subAccountId?: string,
): BankAccount | undefined {
  return connection.bankingInformation?.upd?.bankAccounts.find(
    account =>
      account.accountNumber === accountNumber &&
      (account.subAccountId ?? undefined) === (subAccountId || undefined),
  );
}

function canFetchStatements(
  productId: string,
  connection: FinTSConnection,
  account: BankAccount,
) {
  if (!connection.bankingInformation) {
    return false;
  }
  const finTSConfig = FinTSConfig.fromBankingInformation(
    productId,
    PRODUCT_VERSION,
    connection.bankingInformation,
    connection.userId,
  );
  return (
    finTSConfig.isAccountTransactionSupported(account, 'HKKAZ') ||
    finTSConfig.isAccountTransactionSupported(account, 'HKCAZ')
  );
}

function describeAccount(account: BankAccount): string {
  const label = account.product?.trim() || account.accountType;
  const number = account.iban ?? account.accountNumber;
  return `${label} (${number})`;
}

export function listAccounts(
  scope: ConnectionScope,
  connectionId: string,
): { accounts: FinTSAccount[] } | { error: FinTSErrorCode } {
  const productId = getProductId();
  if (!productId) {
    return { error: 'NOT_CONFIGURED' };
  }
  const connection = getConnection(scope, connectionId);
  if (!connection) {
    return { error: 'CONNECTION_NOT_FOUND' };
  }

  const institution =
    connection.bankingInformation?.bpd?.bankName || connection.name;

  const accounts = (connection.bankingInformation?.upd?.bankAccounts ?? [])
    .filter(account => canFetchStatements(productId, connection, account))
    .map(account => ({
      account_id: buildAccountId(connection.id, account),
      name: describeAccount(account),
      institution,
      orgDomain: null,
      orgId: connection.id,
      iban: account.iban,
      currency: account.currency,
    }));

  return { accounts };
}

/** Parses `YYYY-MM-DD` as a local date, matching the statement parsers. */
function parseDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export async function fetchTransactions(
  scope: ConnectionScope,
  accountId: string,
  startDate: string,
): Promise<FinTSTransactionsResult> {
  const ref = parseAccountId(accountId);
  const from = parseDay(startDate);
  if (!ref || !from) {
    return { kind: 'error', code: 'INVALID_INPUT' };
  }

  const productId = getProductId();
  if (!productId) {
    return { kind: 'error', code: 'NOT_CONFIGURED' };
  }
  if (!getConnection(scope, ref.connectionId)) {
    return { kind: 'error', code: 'CONNECTION_NOT_FOUND' };
  }

  const session = getSession(ref.connectionId);
  return session.run(async () => {
    const connection = getConnection(scope, ref.connectionId);
    if (!connection) {
      return { kind: 'error', code: 'CONNECTION_NOT_FOUND' } as const;
    }

    const pin = usablePin(session, connection);
    // While a TAN is outstanding, do not open a competing dialog.
    if (!pin || session.pending) {
      return { kind: 'auth-required' } as const;
    }

    const account = findAccount(
      connection,
      ref.accountNumber,
      ref.subAccountId,
    );
    if (!account) {
      return { kind: 'error', code: 'ACCOUNT_MISSING' } as const;
    }

    try {
      const requestKey = `${accountId}|${startDate}`;
      let statements = session.results.get(requestKey)?.value;
      session.results.delete(requestKey);

      const client = createClient(productId, connection, pin);
      if (!statements) {
        if (!client.canGetAccountStatements(account)) {
          return { kind: 'error', code: 'NOT_SUPPORTED' } as const;
        }

        await assertBankUrlAllowed(client);
        const response = await client.getAccountStatements(account, from);

        if (response.requiresTan) {
          session.pending = createPending(
            'statements',
            client,
            response,
            requestKey,
          );
          return { kind: 'auth-required' } as const;
        }

        if (!response.success) {
          if (
            classifyBankAnswers(response.bankAnswers) === 'credentials-rejected'
          ) {
            rejectCredentials(scope, ref.connectionId, session, response);
            return { kind: 'auth-required' } as const;
          }
          return {
            kind: 'error',
            code: 'BANK_ERROR',
            message: describeBankErrors(response.bankAnswers),
          } as const;
        }

        if (response.bankingInformationUpdated) {
          persistBankingInformation(scope, ref.connectionId, client);
        }
        statements = response;
      }

      touchPin(session, pin);

      const hasClosingBalance = statements.statements.some(
        statement => statement.closingBalance != null,
      );
      const balance = hasClosingBalance
        ? undefined
        : await fetchBalance(client, account);

      return {
        kind: 'ok',
        data: mapStatements(
          accountId,
          statements.statements,
          startDate,
          account.currency || 'EUR',
          balance,
        ),
      } as const;
    } catch (error) {
      if (error instanceof BankUrlBlockedError) {
        return {
          kind: 'error',
          code: 'BANK_URL_BLOCKED',
          message: error.message,
        } as const;
      }
      return {
        kind: 'error',
        code: 'BANK_ERROR',
        message: error instanceof Error ? error.message : String(error),
      } as const;
    }
  });
}

/**
 * Without any statement there is no closing balance, which the first sync
 * needs for the starting balance. Ask for the balance separately, but never
 * make the user approve a second TAN just for it.
 */
async function fetchBalance(
  client: FinTSClient,
  account: BankAccount,
): Promise<AccountBalanceResponse['balance']> {
  if (!client.canGetAccountBalance(account)) {
    return undefined;
  }
  await assertBankUrlAllowed(client);
  const response = await client.getAccountBalance(account);
  if (response.requiresTan || !response.success) {
    return undefined;
  }
  return response.balance;
}
