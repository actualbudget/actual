export function determineOffBudget(plaidAccountType) {
  switch (plaidAccountType) {
    case 'brokerage':
    case 'investment':
    case 'loan':
    case 'other':
      return true;
    case 'credit':
    case 'depository':
    default:
      return false;
  }
}
