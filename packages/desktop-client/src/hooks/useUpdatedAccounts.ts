import { useSelector } from '@desktop-client/redux';

export function useUpdatedAccounts() {
  return useSelector(state => state.account.updatedAccounts);
}
