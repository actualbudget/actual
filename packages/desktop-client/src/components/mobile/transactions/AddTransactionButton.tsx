import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import * as Platform from '@actual-app/core/shared/platform';

import {
  acquireIOSKeyboard,
  scheduleSafetyRelease,
} from './iosKeyboardProxy';

import { useNavigate } from '#hooks/useNavigate';

type AddTransactionButtonProps = {
  to?: string;
  accountId?: string;
  categoryId?: string;
};

export function AddTransactionButton({
  to = '/transactions/new',
  accountId,
  categoryId,
}: AddTransactionButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      variant="bare"
      aria-label={t('Add transaction')}
      style={{ margin: 10 }}
      onPress={() => {
        // On iOS, programmatic focus() won't open the keyboard unless it
        // originates from a user gesture.  We grab focus on a hidden proxy
        // input *now* (inside the tap handler) so the keyboard opens
        // immediately. TransactionEdit will transfer focus to the real
        // amount input on mount and then clean up the proxy.
        if (Platform.isIOSAgent) {
          acquireIOSKeyboard();
          // Safety: if the destination page never calls
          // releaseIOSKeyboard (e.g. navigation is cancelled), clean up
          // after a timeout. scheduleSafetyRelease cancels any prior
          // timer so a rapid double-tap won't release a newer proxy.
          scheduleSafetyRelease();
        }
        void navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
