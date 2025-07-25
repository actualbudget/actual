import React from 'react';

import { SvgAdd } from '@actual-app/components/icons';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

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
      condOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: null,
        },
      ],
      actions: [
        {
          field: 'category',
          op: 'set',
          value: null,
        },
      ],
    };

    dispatch(
      pushModal('edit-rule', {
        rule: newRule,
        onSave: onRuleAdded,
      }),
    );
  };

  return (
    <View
      role="button"
      aria-label="Add new rule"
      style={{
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: theme.pillBackgroundLight,
        cursor: 'pointer',
      }}
      onPress={handleAddRule}
    >
      <SvgAdd 
        width={16} 
        height={16} 
        style={{ color: theme.pillTextHighlighted }} 
      />
    </View>
  );
}