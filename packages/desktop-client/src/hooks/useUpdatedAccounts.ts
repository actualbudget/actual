import { useSelector } from '#redux';

export function useUpdatedAccounts() {
  return useSelector(state => state.account.updatedAccounts);
}
