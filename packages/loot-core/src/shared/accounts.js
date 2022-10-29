export function fromPlaidAccountType(type, subtype) {
  switch (type) {
    case 'brokerage':
    case 'investment':
      return 'investment';
    case 'credit':
      return 'credit';
    case 'loan':
      return 'debt';
    case 'other':
      return 'other';
    case 'depository':
    default:
      switch (subtype) {
        case 'money market':
        case 'savings':
          return 'savings';
        case 'cd':
          return 'cd';
        default:
          return 'checking';
      }
  }
}

export function prettyAccountType(type) {
  switch (type) {
    case 'checking':
      return 'Checking';
    case 'savings':
      return 'Savings';
    case 'cd':
      return 'CD';
    case 'investment':
      return 'Investment';
    case 'credit':
      return 'Credit Card';
    case 'mortgage':
      return 'Mortgage';
    case 'debt':
      return 'Debt';
    case 'other':
    default:
      return 'Other';
  }
}

export function determineOffBudget(type) {
  switch (type) {
    case 'investment':
    case 'mortgage':
    case 'debt':
    case 'other':
      return true;
    default:
  }
  return false;
}

export function accountNameErrorMessage(errorName) {
  switch (errorName) {
    case 'already-exists':
      return 'This account already exists';
    case 'required':
    default:
      return 'Name is required';
  }
}
