import { useSelector } from 'react-redux';

export function useUpdatedAccounts() {
  return useSelector(state => state.queries.updatedAccounts);
}
