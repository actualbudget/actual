import React from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models';

import { theme } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FieldSelect } from '../modals/EditRule';

export function CondOpMenu({
  conditionsOp,
  onCondOpChange,
  filters,
}: {
  conditionsOp: string;
  onCondOpChange: (value: string, filters: RuleConditionEntity[]) => void;
  filters: RuleConditionEntity[];
}) {
  return filters.length > 1 ? (
    <Text style={{ color: theme.pageText, marginTop: 11, marginRight: 5 }}>
      <FieldSelect
        style={{ display: 'inline-flex' }}
        fields={[
          ['and', 'all'],
          ['or', 'any'],
        ]}
        value={conditionsOp}
        onChange={(name: string, value: string) =>
          onCondOpChange(value, filters)
        }
      />
      of:
    </Text>
  ) : (
    <View />
  );
}
