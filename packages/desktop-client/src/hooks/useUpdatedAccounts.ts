import { useAppSelector } from '../redux';

export function useUpdatedAccounts() {
  return useAppSelector(state => state.queries.updatedAccounts);
}
