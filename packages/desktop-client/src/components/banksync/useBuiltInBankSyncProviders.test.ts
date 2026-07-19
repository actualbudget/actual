import { getPermissionWarning } from './useBuiltInBankSyncProviders';

test.each([
  ['offline', true, true, 'general'],
  ['no-server', false, false, 'general'],
  ['online', true, false, null],
  ['online', false, false, 'general'],
  ['online', false, true, 'file-owner'],
] as const)(
  'returns the expected warning for %s connectivity, admin %s, owner %s',
  (status, isAdmin, isFileOwner, expected) => {
    expect(getPermissionWarning(status, isAdmin, isFileOwner)).toBe(expected);
  },
);
