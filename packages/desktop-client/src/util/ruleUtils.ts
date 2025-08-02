import { v4 as uuid } from 'uuid';

import { type RuleEntity } from 'loot-core/types/models';

export type ActionSplit = {
  id: string;
  actions: RuleEntity['actions'];
};

export function groupActionsBySplitIndex(
  actions: RuleEntity['actions'],
): ActionSplit[] {
  return actions.reduce((acc, action) => {
    const splitIndex =
      'options' in action ? (action.options?.splitIndex ?? 0) : 0;
    acc[splitIndex] = acc[splitIndex] ?? { id: uuid(), actions: [] };
    acc[splitIndex].actions.push(action);
    return acc;
  }, [] as ActionSplit[]);
}
