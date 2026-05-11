import type { RuleEntity } from '@actual-app/core/types/models';
import { v4 as uuidv4 } from 'uuid';

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
    acc[splitIndex] = acc[splitIndex] ?? {
      id: uuidv4(),
      actions: [],
    };
    acc[splitIndex].actions.push(action);
    return acc;
  }, [] as ActionSplit[]);
}
