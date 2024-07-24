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

  'get-category-groups': () => Promise<{
    grouped: Array<CategoryGroupEntity>;
  }>;

  'category-validate': (
    rule: Partial<CategoryEntity>,
  ) => Promise<{ error: ValidationError | null }>;

  'category-create': (arg: {
    name: string;
    groupId: string;
    isIncome?: boolean;
    hidden?: boolean;
  }) => Promise<string>;

  'category-update': (category: CategoryEntity) => Promise<unknown>;

  'category-move': (arg: { id: string; groupId: string; targetId: string }) => Promise<unknown>;

  'category-delete': (arg: { id: string; transferId?: string }) => Promise<{ error?: string }>;

  'category-group-create': (arg: {
    name: string;
    isIncome?: boolean;
  }) => Promise<string>;

  'category-group-update': (group: CategoryGroupEntity) => Promise<unknown>;

  'category-group-move': (arg: { id: string; targetId: string }) => Promise<unknown>;

  'category-group-delete': (arg: { id: string; transferId: string }) => Promise<unknown>;

  'must-category-transfer': (arg: { id: string }) => Promise<unknown>;
}
