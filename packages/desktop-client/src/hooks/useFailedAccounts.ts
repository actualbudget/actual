import { useSelector } from 'react-redux';

export function useFailedAccounts() {
  return useSelector(state => state.account.failedAccounts);
}
