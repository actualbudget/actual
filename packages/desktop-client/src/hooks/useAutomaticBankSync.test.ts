import type { AccountEntity } from '@actual-app/core/types/models';

import {
  isAutomaticSyncDue,
  parseBankSyncInterval,
} from './useAutomaticBankSync';

const MINUTE = 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function account(overrides: Partial<AccountEntity> = {}): AccountEntity {
  return {
    id: 'account-1',
    account_group_id: null,
    name: 'Checking',
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: 'bank-account-1',
    bank: 'bank-1',
    bankName: 'Bank',
    bankId: 'bank-1',
    mask: '1234',
    official_name: 'Checking',
    balance_current: 0,
    balance_available: 0,
    balance_limit: null,
    account_sync_source: 'goCardless',
    last_sync: null,
    bank_sync_status: 'ok',
    ...overrides,
  };
}

describe('parseBankSyncInterval', () => {
  it('treats unset, zero and invalid values as disabled', () => {
    expect(parseBankSyncInterval(undefined)).toBe(0);
    expect(parseBankSyncInterval('')).toBe(0);
    expect(parseBankSyncInterval('0')).toBe(0);
    expect(parseBankSyncInterval('not a number')).toBe(0);
    expect(parseBankSyncInterval('-60')).toBe(0);
  });

  it('converts minutes to milliseconds', () => {
    expect(parseBankSyncInterval('60')).toBe(HOUR);
    expect(parseBankSyncInterval('1440')).toBe(24 * HOUR);
  });
});

describe('isAutomaticSyncDue', () => {
  const base = {
    now: NOW,
    intervalMs: HOUR,
    lastAutomaticRun: undefined,
    accounts: [account()],
    isServerOnline: true,
  };

  it('is not due while the sync server is unreachable', () => {
    expect(isAutomaticSyncDue({ ...base, isServerOnline: false })).toBe(false);
  });

  it('becomes due again as soon as the server is reachable', () => {
    // Being offline must not consume the interval: the caller only records an
    // attempt when this returns true, so a sync fires on the next check rather
    // than waiting out another interval.
    expect(isAutomaticSyncDue({ ...base, isServerOnline: false })).toBe(false);
    expect(isAutomaticSyncDue({ ...base, isServerOnline: true })).toBe(true);
  });

  it('is not due when automatic syncing is disabled', () => {
    expect(isAutomaticSyncDue({ ...base, intervalMs: 0 })).toBe(false);
  });

  it('is not due when there are no linked accounts', () => {
    expect(isAutomaticSyncDue({ ...base, accounts: [] })).toBe(false);
    expect(
      isAutomaticSyncDue({ ...base, accounts: [account({ bank: null })] }),
    ).toBe(false);
    expect(
      isAutomaticSyncDue({ ...base, accounts: [account({ closed: 1 })] }),
    ).toBe(false);
    expect(
      isAutomaticSyncDue({ ...base, accounts: [account({ tombstone: 1 })] }),
    ).toBe(false);
  });

  it('is due when a linked account has never synced', () => {
    expect(isAutomaticSyncDue(base)).toBe(true);
  });

  it('is not due when a sync happened within the interval', () => {
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [account({ last_sync: String(NOW - 30 * 60 * 1000) })],
      }),
    ).toBe(false);
  });

  it('is due when one account is overdue even if another just synced', () => {
    // A manual sync of a single account used to postpone every account until
    // the next interval.
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'recent', last_sync: String(NOW - MINUTE) }),
          account({ id: 'stale', last_sync: String(NOW - 2 * HOUR) }),
        ],
      }),
    ).toBe(true);
  });

  it('is not due while every account has synced within the interval', () => {
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'a', last_sync: String(NOW - MINUTE) }),
          account({ id: 'b', last_sync: String(NOW - 30 * MINUTE) }),
        ],
      }),
    ).toBe(false);
  });

  it('is due when one account has never synced', () => {
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'a', last_sync: String(NOW - MINUTE) }),
          account({ id: 'never', last_sync: null }),
        ],
      }),
    ).toBe(true);
  });

  it('does not let a closed account force a sync', () => {
    // A closed account with an ancient last_sync must not force a sync.
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'a', last_sync: String(NOW - MINUTE) }),
          account({
            id: 'closed',
            closed: 1,
            last_sync: String(NOW - 5 * HOUR),
          }),
        ],
      }),
    ).toBe(false);
  });

  it('is due once the last sync is older than the interval', () => {
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [account({ last_sync: String(NOW - HOUR) })],
      }),
    ).toBe(true);
  });

  it('uses the oldest synced account as the reference point', () => {
    // Previously the most recent sync was used, so the recently-synced account
    // below would have suppressed the sync the stale one needs.
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'a', last_sync: String(NOW - 5 * HOUR) }),
          account({ id: 'b', last_sync: String(NOW - 10 * MINUTE) }),
        ],
      }),
    ).toBe(true);
  });

  it('ignores unlinked accounts when looking for the last sync', () => {
    expect(
      isAutomaticSyncDue({
        ...base,
        accounts: [
          account({ id: 'a', last_sync: String(NOW - 5 * HOUR) }),
          account({ id: 'b', bank: null, last_sync: String(NOW) }),
        ],
      }),
    ).toBe(true);
  });

  it('does not retry within the interval after a failed attempt', () => {
    // A failed sync leaves `last_sync` untouched, so only the local
    // last-attempt timestamp prevents a retry storm.
    expect(
      isAutomaticSyncDue({
        ...base,
        lastAutomaticRun: NOW - 10 * 60 * 1000,
      }),
    ).toBe(false);

    expect(
      isAutomaticSyncDue({
        ...base,
        lastAutomaticRun: NOW - HOUR,
      }),
    ).toBe(true);
  });
});
