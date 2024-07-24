import { type CategoryEntity, CategoryGroupEntity } from '../../../types/models';

type ValidationError = {
  conditionErrors: string[];
  actionErrors: string[];
};

export interface CategoryHandlers {
  'get-categories': () => Promise<{
    grouped: Array<CategoryGroupEntity>;
    list: Array<CategoryEntity>;
  }>;

  'category-validate': (
    rule: Partial<CategoryEntity>,
  ) => Promise<{ error: ValidationError | null }>;

  'category-create': (arg: {
    name;
    groupId;
    isIncome?;
    hidden?: boolean;
  }) => Promise<string>;

  'category-update': (category) => Promise<unknown>;

  'category-move': (arg: { id; groupId; targetId }) => Promise<unknown>;

  'category-delete': (arg: { id; transferId? }) => Promise<{ error?: string }>;

  'category-group-create': (arg: {
    name;
    isIncome?: boolean;
  }) => Promise<string>;

  'category-group-update': (group) => Promise<unknown>;

  'category-group-move': (arg: { id; targetId }) => Promise<unknown>;

  'category-group-delete': (arg: { id; transferId }) => Promise<unknown>;

  'must-category-transfer': (arg: { id }) => Promise<unknown>;
}
