import { useTranslation } from 'react-i18next';

import type {
  EnableBankingErrorCode,
  EnableBankingErrorInterface,
} from 'loot-core/types/models/enablebanking';

import { Error as ErrorAlert } from '@desktop-client/components/alerts';

export function EnableBankingErrorAlert({
  error,
}: {
  error: EnableBankingErrorInterface;
}) {
  const { t } = useTranslation();

  const errorMessages: Partial<Record<EnableBankingErrorCode, string>> = {
    TIME_OUT: t('Timed out. Please try again.'),
    AUTH_FAILED: t('Authentication failed. Please try again.'),
    ENABLEBANKING_SESSION_CLOSED: t(
      'Your bank connection has expired. Please re-link your bank account.',
    ),
    ENABLEBANKING_APPLICATION_INACTIVE: t(
      'Your Enable Banking application is inactive. Please reconfigure.',
    ),
    ENABLEBANKING_NOT_CONFIGURED: t(
      'Enable Banking is not configured. Please set up your credentials first.',
    ),
    ENABLEBANKING_SECRETS_INVALID: t(
      'Enable Banking credentials are invalid. Please reconfigure.',
    ),
    INTERNAL_ERROR: t('An internal error occurred. Please try again.'),
  };

  return (
    <ErrorAlert style={{ alignSelf: 'center', marginBottom: 10 }}>
      {error.error_code in errorMessages
        ? errorMessages[error.error_code]
        : t(
            'An error occurred while linking your account, sorry! The potential issue could be: {{ message }}',
            { message: error.error_type },
          )}
    </ErrorAlert>
  );
}
