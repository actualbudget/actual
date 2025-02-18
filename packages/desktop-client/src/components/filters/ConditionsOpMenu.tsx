import React from 'react';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { type RuleConditionEntity } from 'loot-core/types/models';

import { theme } from '../../style';
import { FieldSelect } from '../modals/EditRuleModal';

export function ConditionsOpMenu({
  conditionsOp,
  onChange,
  conditions,
}: {
  conditionsOp: string;
  onChange: (value: 'and' | 'or') => void;
  conditions: RuleConditionEntity[];
}) {
  return conditions.length > 1 ? (
    <Text style={{ color: theme.pageText, marginTop: 11, marginRight: 5 }}>
      <FieldSelect
        style={{ display: 'inline-flex' }}
        fields={[
          ['and', 'all'],
          ['or', 'any'],
        ]}
        value={conditionsOp}
        onChange={onChange}
      />
      of:
    </Text>
  ) : (
    <View />
  );
}
