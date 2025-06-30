import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function AddRuleButton() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const onPress = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'mobile-create-rule',
          options: {},
        },
      }),
    );
  };

  return (
    <Button
      variant="bare"
      aria-label={t('Add rule')}
      style={{ margin: 10 }}
      onPress={onPress}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}