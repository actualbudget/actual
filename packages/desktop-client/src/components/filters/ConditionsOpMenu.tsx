import React from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models';

import { theme } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FieldSelect } from '../modals/EditRule';

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
