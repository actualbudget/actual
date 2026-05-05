import type { RuleEntity } from '@actual-app/core/types/models';
import { generateUUID } from '#util/uuid';

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
      id: generateUUID(),
      actions: [],
    };
    acc[splitIndex].actions.push(action);
    return acc;
  }, [] as ActionSplit[]);
}
