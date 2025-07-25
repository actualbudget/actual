import React from 'react';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { type NewRuleEntity } from 'loot-core/types/models';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type AddRuleButtonProps = {
  onRuleAdded: () => void;
};

export function AddRuleButton({ onRuleAdded }: AddRuleButtonProps) {
  const dispatch = useDispatch();

  const handleAddRule = () => {
    const newRule: NewRuleEntity = {
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: '',
          type: 'id',
        },
      ],
      actions: [
        {
          field: 'category',
          op: 'set',
          value: '',
          type: 'id',
        },
      ],
    };

    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule: newRule,
            onSave: onRuleAdded,
          },
        },
      }),
    );
  };

  return (
    <Button
      variant="bare"
      aria-label="Add new rule"
      style={{ margin: 10 }}
      onPress={handleAddRule}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
