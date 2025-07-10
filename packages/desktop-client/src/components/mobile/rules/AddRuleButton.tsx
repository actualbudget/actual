import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { type NewRuleEntity } from 'loot-core/types/models';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type AddRuleButtonProps = {
  onRuleCreated?: () => void;
};

export function AddRuleButton({ onRuleCreated }: AddRuleButtonProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const onPress = () => {
    const rule: NewRuleEntity = {
      stage: null,
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: null,
          type: 'id',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: null,
          type: 'id',
        },
      ],
    };

    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              if (onRuleCreated) {
                await onRuleCreated();
              }
            },
          },
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