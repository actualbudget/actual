export function mapApiTokenError(
  code: string,
  t: (key: string) => string,
): string {
  switch (code) {
    case 'not-logged-in':
      return t('You are not logged in. Please sign in and try again.');
    case 'network-failure':
      return t('Could not reach the server. Please try again.');
    case 'forbidden-auth-method':
      return t(
        'API tokens can only be managed when signed in with a password.',
      );
    case 'invalid-name':
      return t('Please enter a valid name for the token.');
    case 'invalid-budget-ids':
    case 'invalid-budget-id':
      return t('One or more selected budgets are invalid.');
    case 'empty-budget-ids':
      return t('Please select at least one budget for this token.');
    case 'forbidden-budget':
      return t('You do not have access to one or more selected budgets.');
    case 'invalid-expires-at':
      return t('The expiration date is invalid.');
    case 'invalid-token-id':
      return t('The token could not be found.');
    case 'invalid-enabled':
      return t('The requested token state is invalid.');
    case 'not-found':
      return t('The token could not be found.');
    case 'token-expired':
      return t('Your session has expired. Please sign in again.');
    case 'token-scope-error':
      return t('You do not have access to perform this action.');
    case 'internal-error':
      return t('The server encountered an error. Please try again.');
    default:
      return t('An unexpected error occurred. Please try again.');
  }
}

export function formatDate(
  timestamp: number | null | undefined,
  t: (key: string) => string,
): string {
  if (timestamp === null || timestamp === undefined || timestamp === -1) {
    return t('Never');
  }
  return new Date(timestamp * 1000).toLocaleDateString();
}
