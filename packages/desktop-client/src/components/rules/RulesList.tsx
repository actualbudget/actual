import React from 'react';

import { type RuleEntity } from 'loot-core/src/types/models';

import View from '../common/View';

import RuleRow from './RuleRow';

type RulesListProps = {
  rules: RuleEntity[];
  selectedItems: Set<string>;
  hoveredRule?: string;
  onHover?: (id: string | null) => void;
  onEditRule?: (rule: RuleEntity) => void;
};

export default function RulesList({
  rules,
  selectedItems,
  hoveredRule,
  onHover,
  onEditRule,
}: RulesListProps) {
  if (rules.length === 0) {
    return null;
  }

  return (
    <View>
      {rules.map(rule => {
        let hovered = hoveredRule === rule.id;
        let selected = selectedItems.has(rule.id);

        return (
          <RuleRow
            key={rule.id}
            rule={rule}
            hovered={hovered}
            selected={selected}
            onHover={onHover}
            onEditRule={onEditRule}
          />
        );
      })}
    </View>
  );
}
