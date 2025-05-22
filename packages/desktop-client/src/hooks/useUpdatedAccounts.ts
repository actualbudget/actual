import { useSelector } from '@desktop-client/redux';

export function useUpdatedAccounts() {
  return useSelector(state => state.queries.updatedAccounts);
}
