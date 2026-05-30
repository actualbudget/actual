import { send } from '@actual-app/core/platform/client/connection';
import { groupById } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  NearbyPayeeEntity,
  PayeeEntity,
} from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';
import { t } from 'i18next';
import memoizeOne from 'memoize-one';

import { getAccountsById } from '#accounts/accountsSlice';

import { locationService } from './location';

export const payeeQueries = {
  all: () => ['payees'],
  lists: () => [...payeeQueries.all(), 'lists'],
  list: () =>
    queryOptions<PayeeEntity[]>({
      queryKey: [...payeeQueries.lists()],
      queryFn: async () => {
        const payees: PayeeEntity[] = (await send('payees-get')) ?? [];
        return translatePayees(payees);
      },
      placeholderData: [],
      // Manually invalidated when payees change via sync events
      staleTime: Infinity,
    }),
  listCommon: () =>
    queryOptions<PayeeEntity[]>({
      queryKey: [...payeeQueries.lists(), 'common'],
      queryFn: async () => {
        const payees: PayeeEntity[] = (await send('common-payees-get')) ?? [];
        return translatePayees(payees);
      },
      placeholderData: [],
      // Manually invalidated when payees change via sync events
      staleTime: Infinity,
    }),
  listOrphaned: () =>
    queryOptions<Pick<PayeeEntity, 'id'>[]>({
      queryKey: [...payeeQueries.lists(), 'orphaned'],
      queryFn: async () => {
        const payees: Pick<PayeeEntity, 'id'>[] =
          (await send('payees-get-orphaned')) ?? [];
        return payees;
      },
      placeholderData: [],
      // Manually invalidated when payees change via sync events
      staleTime: Infinity,
    }),
  ruleCounts: () =>
    queryOptions<Map<PayeeEntity['id'], number>>({
      queryKey: [...payeeQueries.lists(), 'ruleCounts'],
      queryFn: async () => {
        const counts = await send('payees-get-rule-counts');
        return new Map(Object.entries(counts ?? {}));
      },
      placeholderData: new Map(),
    }),
  listNearby: () =>
    queryOptions<NearbyPayeeEntity[]>({
      queryKey: [...payeeQueries.all(), 'nearby'],
      queryFn: async () => {
        const position = await locationService.getCurrentPosition();
        return locationService.getNearbyPayees({
          latitude: position.latitude,
          longitude: position.longitude,
        });
      },
      placeholderData: [],
      // Manually invalidated when payee locations change
      staleTime: Infinity,
    }),
};

export const getActivePayees = memoizeOne(
  (payees: PayeeEntity[], accounts: AccountEntity[]) => {
    const accountsById = getAccountsById(accounts);

    return translatePayees(
      payees.filter(payee => {
        if (payee.transfer_acct) {
          const account = accountsById[payee.transfer_acct];
          return account != null && !account.closed;
        }
        return true;
      }),
    );
  },
);

export const getPayeesById = memoizeOne(
  (payees: PayeeEntity[] | null | undefined) =>
    groupById(translatePayees(payees || [])),
);

function translatePayees(payees: PayeeEntity[]): PayeeEntity[] {
  return payees.map(payee =>
    payee.name === 'Starting Balance'
      ? { ...payee, name: t('Starting Balance') }
      : payee,
  );
}
